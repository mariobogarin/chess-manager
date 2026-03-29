import { prisma } from "@/lib/db/client";
import { parsePgn, type Ply } from "@/lib/pgn/parser";
import { analyzePositions, DEFAULT_CONFIG, type StockfishConfig } from "@/lib/stockfish/engine";
import { uciToSan, uciLineToSanLine, toUci } from "@/lib/stockfish/sanConverter";
import { classifyMove, normalizeScore, toPlayerPerspective } from "./classifier";
import { detectPhase, type GamePhase } from "./gamePhase";
import { detectTags } from "./tags";
import { selectKeyMoves } from "./keyMoveDetection";
import { buildExplanation } from "./explanations";
import { detectPatterns } from "@/lib/patterns";

export interface AnalyzeGameOptions {
  config?: StockfishConfig;
  onProgress?: (msg: string) => void;
}

export async function analyzeGame(
  gameId: string,
  options: AnalyzeGameOptions = {}
): Promise<void> {
  const { config = DEFAULT_CONFIG, onProgress } = options;

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error(`Game ${gameId} not found`);

  onProgress?.("Parsing PGN...");

  let parsed;
  try {
    parsed = parsePgn(game.pgn);
  } catch (err) {
    throw new Error(`PGN parse failed: ${err}`);
  }

  const { plies } = parsed;
  if (plies.length === 0) throw new Error("Game has no moves");

  const profile = await prisma.playerProfile.findUnique({ where: { id: game.playerProfileId } });
  const playerUsername = profile?.username ?? "";

  const playerColor: "w" | "b" =
    game.whiteUsername.toLowerCase() === playerUsername.toLowerCase() ? "w" : "b";

  // ── Stockfish: analyze every position ─────────────────────────────────────
  onProgress?.(`Analyzing ${plies.length} positions with Stockfish...`);

  const engineResults = await analyzePositions(
    plies.map((ply) => ({ plyIndex: ply.plyIndex, fen: ply.fenBefore })),
    config,
    (done, total) => onProgress?.(`Stockfish: ${done}/${total}`)
  );

  const evalMap = new Map(engineResults.map((r) => [r.plyIndex, r]));

  onProgress?.("Persisting move analysis...");

  // ── Build per-move records ─────────────────────────────────────────────────
  const moveRecords = plies.map((ply: Ply) => {
    const engineBefore = evalMap.get(ply.plyIndex);
    const engineAfter = evalMap.get(ply.plyIndex + 1);
    const isPlayerMove = ply.color === playerColor;

    // Scores in white's perspective
    const evalBeforeWhite =
      engineBefore && !engineBefore.error
        ? normalizeScore(engineBefore.result.score, engineBefore.result.isMate, ply.color)
        : null;

    const evalAfterWhite =
      engineAfter && !engineAfter.error
        ? normalizeScore(
            engineAfter.result.score,
            engineAfter.result.isMate,
            ply.color === "w" ? "b" : "w"
          )
        : null;

    // Player-perspective scores
    const evalBeforePlayer =
      evalBeforeWhite !== null ? toPlayerPerspective(evalBeforeWhite, playerColor) : null;
    const evalAfterPlayer =
      evalAfterWhite !== null ? toPlayerPerspective(evalAfterWhite, playerColor) : null;

    const evalLoss =
      isPlayerMove && evalBeforePlayer !== null && evalAfterPlayer !== null
        ? evalBeforePlayer - evalAfterPlayer
        : null;

    const classification = isPlayerMove
      ? classifyMove({
          evalBefore: evalBeforePlayer,
          evalAfter: evalAfterPlayer,
          bestEval: null,
          isMate: engineBefore?.result.isMate ?? false,
          bestIsMate: false,
          mateIn: null,
          plyIndex: ply.plyIndex,
          legalMoveCount: 20, // TODO: compute actual legal move count via chess.js
        })
      : "good";

    // Best move + SAN conversion
    const bestMoveUci = engineBefore?.result.bestMove ?? null;
    const bestMoveSan = bestMoveUci ? uciToSan(ply.fenBefore, bestMoveUci) : null;

    // Principal variation as SAN array
    const rawPv = engineBefore?.result.bestLine ?? [];
    const pvSan = uciLineToSanLine(ply.fenBefore, rawPv);

    // Actual move UCI
    const uci = toUci(ply.from, ply.to, ply.promotion);

    // Tags (only for player mistakes with eval data)
    const phase: GamePhase = detectPhase(ply.plyIndex, ply.fenBefore);
    let tags: string[] = [];
    if (isPlayerMove && evalLoss !== null && evalLoss >= 40) {
      tags = detectTags({
        phase,
        playerColor,
        evalLoss,
        evalBeforePlayer: evalBeforePlayer ?? 0,
        evalAfterPlayer: evalAfterPlayer ?? 0,
        bestMoveUci,
        actualFrom: ply.from,
        actualPiece: ply.piece,
        pvLength: rawPv.length,
      });
    }

    // Explanation
    const explanationShort =
      isPlayerMove && evalLoss !== null && evalLoss >= 40
        ? buildExplanation({
            tags,
            classification,
            phase,
            bestMoveSan,
            evalLoss,
            san: ply.san,
            evalBeforePlayer: evalBeforePlayer ?? undefined,
            evalAfterPlayer: evalAfterPlayer ?? undefined,
          })
        : null;

    return {
      gameId: game.id,
      plyIndex: ply.plyIndex,
      moveNumber: ply.moveNumber,
      side: ply.color,
      san: ply.san,
      uci,
      fenBefore: ply.fenBefore,
      fenAfter: ply.fenAfter,
      bestMove: bestMoveUci,
      bestMoveSan,
      bestLine: rawPv.join(" ") || null,
      principalVariation: JSON.stringify(pvSan),
      evalBefore: evalBeforeWhite,
      evalAfter: evalAfterWhite,
      evalLoss,
      classification,
      detectedTags: JSON.stringify(tags),
      explanationShort,
      // key move fields will be set in the next pass
      isKeyMove: false,
      keyMoveScore: 0,
      keyReason: null,
      // ephemeral — not persisted, used for key move detection below
      _evalBeforePlayer: evalBeforePlayer,
      _evalAfterPlayer: evalAfterPlayer,
      _phase: phase,
      _tags: tags,
      _mateAllowed: (engineBefore?.result.isMate === false && engineAfter?.result.isMate === true) ?? false,
    };
  });

  // ── Persist base move analyses ─────────────────────────────────────────────
  for (const rec of moveRecords) {
    const { _evalBeforePlayer, _evalAfterPlayer, _phase, _tags, _mateAllowed, ...data } = rec;
    await prisma.moveAnalysis.upsert({
      where: { gameId_plyIndex: { gameId: rec.gameId, plyIndex: rec.plyIndex } },
      update: data,
      create: data,
    });
  }

  // ── Key move detection ─────────────────────────────────────────────────────
  onProgress?.("Detecting key moments...");

  const playerMoveInputs = moveRecords
    .filter((r) => r.side === playerColor && r.evalLoss !== null)
    .map((r) => ({
      plyIndex: r.plyIndex,
      evalLoss: r.evalLoss,
      evalBeforePlayer: r._evalBeforePlayer,
      evalAfterPlayer: r._evalAfterPlayer,
      classification: r.classification,
      phase: r._phase,
      tags: r._tags,
      mateAllowed: r._mateAllowed,
    }));

  const keyMoves = selectKeyMoves(playerMoveInputs, plies.length);

  const keyMoveSet = new Map(keyMoves.map((k) => [k.plyIndex, k]));
  for (const km of keyMoves) {
    await prisma.moveAnalysis.update({
      where: { gameId_plyIndex: { gameId: game.id, plyIndex: km.plyIndex } },
      data: {
        isKeyMove: true,
        keyMoveScore: km.score,
        keyReason: km.reason,
      },
    });
  }

  // ── Legacy pattern detection (for dashboard summaries) ────────────────────
  onProgress?.("Running pattern detection...");
  const savedAnalyses = await prisma.moveAnalysis.findMany({
    where: { gameId: game.id },
    orderBy: { plyIndex: "asc" },
  });

  const patterns = detectPatterns(savedAnalyses, plies, playerColor);

  // Build game analysis summary
  const playerPlies = savedAnalyses.filter((ma) => ma.side === playerColor);
  const blunders = playerPlies.filter((ma) => ma.classification === "blunder").length;
  const mistakes = playerPlies.filter((ma) => ma.classification === "mistake").length;
  let resultCategory = "solid";
  if (blunders >= 3) resultCategory = "blunder-heavy";
  else if (blunders >= 1) resultCategory = "had-blunders";
  else if (mistakes >= 3) resultCategory = "mistake-heavy";

  const openingIssues = patterns.gameFindings.filter((f) => f.phase === "opening").map((f) => f.label);
  const middlegameIssues = patterns.gameFindings.filter((f) => f.phase === "middlegame").map((f) => f.label);
  const endgameIssues = patterns.gameFindings.filter((f) => f.phase === "endgame").map((f) => f.label);

  // Key moments contribute to major findings
  const keyMomentFindings = keyMoves.map((k) => k.reason);
  const patternFindings = patterns.gameFindings.map((f) => f.description);
  const majorFindings = [...new Set([...keyMomentFindings, ...patternFindings])].slice(0, 6);

  await prisma.gameAnalysisSummary.upsert({
    where: { gameId: game.id },
    update: {
      analyzedAt: new Date(),
      resultCategory,
      openingPhaseIssues: JSON.stringify(openingIssues),
      middlegameIssues: JSON.stringify(middlegameIssues),
      endgameIssues: JSON.stringify(endgameIssues),
      majorFindings: JSON.stringify(majorFindings),
    },
    create: {
      gameId: game.id,
      analyzedAt: new Date(),
      resultCategory,
      openingPhaseIssues: JSON.stringify(openingIssues),
      middlegameIssues: JSON.stringify(middlegameIssues),
      endgameIssues: JSON.stringify(endgameIssues),
      majorFindings: JSON.stringify(majorFindings),
    },
  });

  onProgress?.("Updating pattern summaries...");
  await updatePatternSummaries(game.playerProfileId, game.id, patterns.playerPatterns);

  onProgress?.("Analysis complete.");
}

async function updatePatternSummaries(
  playerProfileId: string,
  gameId: string,
  patterns: { key: string; label: string; description: string }[]
): Promise<void> {
  for (const pattern of patterns) {
    const existing = await prisma.patternSummary.findUnique({
      where: { playerProfileId_key: { playerProfileId, key: pattern.key } },
    });

    if (existing) {
      const sampleIds: string[] = JSON.parse(existing.sampleGameIds);
      if (!sampleIds.includes(gameId)) {
        sampleIds.push(gameId);
        await prisma.patternSummary.update({
          where: { id: existing.id },
          data: {
            frequency: existing.frequency + 1,
            sampleGameIds: JSON.stringify(sampleIds.slice(-10)),
          },
        });
      }
    } else {
      await prisma.patternSummary.create({
        data: {
          playerProfileId,
          key: pattern.key,
          label: pattern.label,
          description: pattern.description,
          frequency: 1,
          sampleGameIds: JSON.stringify([gameId]),
        },
      });
    }
  }
}
