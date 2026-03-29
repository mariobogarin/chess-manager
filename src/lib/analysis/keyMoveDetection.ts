import type { MoveAnalysis } from "@prisma/client";
import type { GamePhase } from "./gamePhase";

// ── Configuration ─────────────────────────────────────────────────────────────
const KEY_MOVE_THRESHOLD = 150;  // minimum keyMoveScore to be flagged
const MAX_KEY_MOVES_SHORT = 3;   // top N for games < 40 moves
const MAX_KEY_MOVES_LONG = 5;    // top N for longer games
const ADJACENT_PLY_BUFFER = 4;   // suppress consecutive mistakes within N plies

// Score bonuses on top of raw eval loss
const BONUS_ADVANTAGE_LOST = 120;  // was winning (≥200cp), no longer is
const BONUS_MATE_ALLOWED = 180;    // engine best prevents mate, actual move allows it
const BONUS_EQUAL_TO_LOSING = 90;  // position flips from ≥-50 to ≤-200
const BONUS_OPENING_KING = 70;     // opening phase + king safety / development error

export interface KeyMoveInput {
  plyIndex: number;
  evalLoss: number;
  evalBeforePlayer: number;
  evalAfterPlayer: number;
  classification: string | null;
  phase: GamePhase;
  tags: string[];
  mateAllowed: boolean;          // best move prevents forced mate that actual allows
}

/** Compute a raw score representing how important this mistake is. */
export function computeKeyMoveScore(input: KeyMoveInput): number {
  const { evalLoss, evalBeforePlayer, evalAfterPlayer, phase, tags, mateAllowed } = input;

  // Only player mistakes produce key moments
  if (evalLoss <= 0) return 0;

  let score = evalLoss; // base = centipawn loss

  // Advantage squandered
  if (evalBeforePlayer >= 200 && evalAfterPlayer < 50) score += BONUS_ADVANTAGE_LOST;

  // Mate allowed
  if (mateAllowed) score += BONUS_MATE_ALLOWED;

  // Position flips from safe to clearly losing
  if (evalBeforePlayer >= -50 && evalAfterPlayer <= -200) score += BONUS_EQUAL_TO_LOSING;

  // Opening king safety / development errors
  if (phase === "opening" && (tags.includes("missed_castling") || tags.includes("missed_development"))) {
    score += BONUS_OPENING_KING;
  }

  return score;
}

/** Human-readable reason for a key move (used for keyReason field). */
export function buildKeyReason(input: KeyMoveInput): string {
  const { evalLoss, evalBeforePlayer, evalAfterPlayer, tags, mateAllowed, classification } = input;

  if (mateAllowed) return "Allowed a forced mating sequence";
  if (tags.includes("lost_advantage") || (evalBeforePlayer >= 200 && evalAfterPlayer < 50)) {
    return `Threw away a winning advantage (±${(evalBeforePlayer / 100).toFixed(1)} → ${(evalAfterPlayer / 100).toFixed(1)})`;
  }
  if (evalBeforePlayer >= -50 && evalAfterPlayer <= -200) {
    return "Turned an equal game into a losing one";
  }
  if (tags.includes("hung_piece")) return `Lost material (${(evalLoss / 100).toFixed(1)} pawns)`;
  if (tags.includes("missed_tactic")) return "Missed a winning tactical sequence";
  if (tags.includes("missed_castling")) return "Left the king exposed when castling was available";
  if (classification === "blunder") return `Blunder: lost ${(evalLoss / 100).toFixed(1)} pawns`;
  if (classification === "mistake") return `Mistake: lost ${(evalLoss / 100).toFixed(1)} pawns`;
  return `Inaccuracy: lost ${(evalLoss / 100).toFixed(1)} pawns`;
}

export interface ScoredMove {
  plyIndex: number;
  score: number;
  reason: string;
}

/**
 * Select the most important key moves from a game.
 * Returns plyIndexes to mark as key moves, sorted chronologically.
 */
export function selectKeyMoves(
  playerMoves: Array<{
    plyIndex: number;
    evalLoss: number | null;
    evalBeforePlayer: number | null;
    evalAfterPlayer: number | null;
    classification: string | null;
    phase: GamePhase;
    tags: string[];
    mateAllowed: boolean;
  }>,
  totalPlies: number
): ScoredMove[] {
  const maxMoves = totalPlies >= 80 ? MAX_KEY_MOVES_LONG : MAX_KEY_MOVES_SHORT;

  // Score every player move
  const scored: ScoredMove[] = playerMoves
    .filter((m) => m.evalLoss !== null && m.evalLoss > 0)
    .map((m) => {
      const input: KeyMoveInput = {
        plyIndex: m.plyIndex,
        evalLoss: m.evalLoss!,
        evalBeforePlayer: m.evalBeforePlayer ?? 0,
        evalAfterPlayer: m.evalAfterPlayer ?? 0,
        classification: m.classification,
        phase: m.phase,
        tags: m.tags,
        mateAllowed: m.mateAllowed,
      };
      return {
        plyIndex: m.plyIndex,
        score: computeKeyMoveScore(input),
        reason: buildKeyReason(input),
      };
    })
    .filter((m) => m.score >= KEY_MOVE_THRESHOLD)
    .sort((a, b) => b.score - a.score); // highest score first

  // Greedy selection: skip moves too close to an already-selected one
  const selected: ScoredMove[] = [];
  for (const candidate of scored) {
    if (selected.length >= maxMoves) break;
    const tooClose = selected.some(
      (s) => Math.abs(s.plyIndex - candidate.plyIndex) <= ADJACENT_PLY_BUFFER
    );
    if (!tooClose) selected.push(candidate);
  }

  // Return in chronological order (by plyIndex)
  return selected.sort((a, b) => a.plyIndex - b.plyIndex);
}
