import { Chess } from "chess.js";
import { countUndevelopedPieces } from "@/lib/pgn/parser";
import type { PatternContext, PatternResult } from "./types";

const OPENING_PLY_END = 24; // First 12 moves (24 plies)
const MAX_UNDEVELOPED_BY_PLY = 12; // By move 6, should have ≤2 undeveloped pieces
const UNDEVELOPED_THRESHOLD = 3; // ≥3 minor pieces undeveloped by move 10 is a concern

/**
 * Detects poor opening development:
 * - Same piece moved multiple times in opening
 * - Too many undeveloped minor pieces by move 10-12
 * - Queen developed too early
 *
 * TODO: Future — cross-reference with opening book to allow for known
 * opening systems that intentionally deviate from development principles.
 */
export function detectOpeningDevelopment(ctx: PatternContext): PatternResult {
  const { plies, playerColor } = ctx;
  const moveTags = new Map<number, string[]>();
  const gameFindings: import("./types").GameFinding[] = [];
  const playerPatterns: { key: string; label: string; description: string }[] = [];

  const openingPlies = plies.filter(
    (p) => p.color === playerColor && p.plyIndex < OPENING_PLY_END
  );

  if (openingPlies.length === 0) return { moveTags, gameFindings, playerPatterns };

  // Track piece movement counts in opening
  const pieceMoveCounts: Record<string, number> = {};
  let samePieceFlagged = false;
  let poorDevelopmentFlagged = false;
  let earlyQueenFlagged = false;

  for (const ply of openingPlies) {
    const pieceKey = `${ply.piece}-${ply.color}`;

    // Track the starting square to identify "same piece moved again"
    // Use from-square as unique piece identifier (rough heuristic)
    const movePieceId = `${ply.piece}-${ply.from}`;
    pieceMoveCounts[movePieceId] = (pieceMoveCounts[movePieceId] ?? 0) + 1;

    // Same minor piece moved 3+ times in opening
    if (
      !samePieceFlagged &&
      (ply.piece === "n" || ply.piece === "b") &&
      pieceMoveCounts[movePieceId] >= 3
    ) {
      samePieceFlagged = true;
      const existing = moveTags.get(ply.plyIndex) ?? [];
      moveTags.set(ply.plyIndex, [...existing, "same_piece_repeated"]);
    }

    // Queen developed too early (before move 4)
    if (!earlyQueenFlagged && ply.piece === "q" && ply.plyIndex < 6) {
      earlyQueenFlagged = true;
      const existing = moveTags.get(ply.plyIndex) ?? [];
      moveTags.set(ply.plyIndex, [...existing, "early_queen"]);
    }

    // Check undeveloped count at move 10 (ply 18-19 for white/black)
    if (!poorDevelopmentFlagged && ply.plyIndex >= MAX_UNDEVELOPED_BY_PLY) {
      const undeveloped = countUndevelopedPieces(ply.fenAfter, playerColor);
      if (undeveloped >= UNDEVELOPED_THRESHOLD) {
        poorDevelopmentFlagged = true;
        const existing = moveTags.get(ply.plyIndex) ?? [];
        moveTags.set(ply.plyIndex, [...existing, "poor_development"]);
      }
    }
  }

  // Generate findings
  if (samePieceFlagged) {
    gameFindings.push({
      phase: "opening" as const,
      label: "Repeated piece moves",
      description: "You spent too many moves on one piece in the opening instead of developing others.",
      patternKey: "same_piece_repeated",
    });
    playerPatterns.push({
      key: "same_piece_repeated",
      label: "Moving same piece repeatedly",
      description: "Wasting opening moves by shuffling one piece instead of developing the army.",
    });
  }

  if (poorDevelopmentFlagged) {
    gameFindings.push({
      phase: "opening" as const,
      label: "Poor piece development",
      description: "Several minor pieces were still undeveloped by move 10-12.",
      patternKey: "poor_development",
    });
    playerPatterns.push({
      key: "poor_development",
      label: "Slow piece development",
      description: "Consistently leaving minor pieces undeveloped through the opening phase.",
    });
  }

  if (earlyQueenFlagged) {
    gameFindings.push({
      phase: "opening" as const,
      label: "Early queen development",
      description: "You developed the queen too early, risking it being chased around.",
      patternKey: "early_queen",
    });
    playerPatterns.push({
      key: "early_queen",
      label: "Early queen development",
      description: "Bringing the queen out before minor pieces are developed.",
    });
  }

  return { moveTags, gameFindings, playerPatterns };
}
