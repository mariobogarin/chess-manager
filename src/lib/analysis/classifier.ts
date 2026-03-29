// ── Move classification thresholds (centipawns) ───────────────────────────────
// All thresholds apply to eval *loss* from the player's perspective.
// Positive loss = position got worse for the player.
// Edit here to tune globally.
export const CLASSIFICATION_THRESHOLDS = {
  great: -50,        // eval *improves* ≥50 cp → great move
  good: 49,          // loss 0–49 cp → good
  inaccuracy: 119,   // loss 50–119 cp → inaccuracy
  mistake: 249,      // loss 120–249 cp → mistake
  // loss ≥250 cp → blunder
} as const;

export type MoveClassification =
  | "book"
  | "great"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "forced";

export interface ClassificationInput {
  evalBefore: number | null; // centipawns, player's perspective
  evalAfter: number | null;  // centipawns, player's perspective (opponent's turn)
  bestEval: number | null;
  isMate: boolean;
  bestIsMate: boolean;
  mateIn: number | null;
  plyIndex: number;
  legalMoveCount: number;   // 1 = forced
}

/**
 * Classify a player's move based on centipawn loss.
 *
 * TODO: Future — incorporate time pressure, opening book lookups,
 * and context-sensitive logic (e.g. objectively bad but only option).
 */
export function classifyMove(input: ClassificationInput): MoveClassification {
  const { evalBefore, evalAfter, legalMoveCount, plyIndex } = input;

  if (legalMoveCount === 1) return "forced";

  // TODO: replace with real opening book lookup
  if (plyIndex < 10 && evalBefore === null) return "book";

  if (evalBefore === null || evalAfter === null) return "good";

  const evalLoss = evalBefore - evalAfter;

  if (evalLoss <= CLASSIFICATION_THRESHOLDS.great) return "great";
  if (evalLoss <= CLASSIFICATION_THRESHOLDS.good) return "good";
  if (evalLoss <= CLASSIFICATION_THRESHOLDS.inaccuracy) return "inaccuracy";
  if (evalLoss <= CLASSIFICATION_THRESHOLDS.mistake) return "mistake";
  return "blunder";
}

/** Normalize engine score to white's perspective (stored consistently). */
export function normalizeScore(
  rawScore: number,
  isMate: boolean,
  sideToMove: "w" | "b"
): number {
  const fromWhite = sideToMove === "w" ? rawScore : -rawScore;
  if (isMate) {
    return fromWhite > 0 ? 10000 - fromWhite : -10000 - fromWhite;
  }
  return fromWhite;
}

/** Convert stored score (white's perspective) to readable string. */
export function scoreToDisplay(score: number): string {
  if (score >= 9000) return `M${10000 - score}`;
  if (score <= -9000) return `M${-(10000 + score)}`;
  const val = score / 100;
  return val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
}

/** Convert score to player's perspective. Positive = good for player. */
export function toPlayerPerspective(scoreWhite: number, playerColor: "w" | "b"): number {
  return playerColor === "w" ? scoreWhite : -scoreWhite;
}

/** Display eval from player's perspective with sign. */
export function evalDisplay(scoreWhite: number | null, playerColor: "w" | "b"): string {
  if (scoreWhite === null) return "?";
  const playerScore = toPlayerPerspective(scoreWhite, playerColor);
  if (playerScore >= 9000) return `M${10000 - playerScore}`;
  if (playerScore <= -9000) return `M${-(10000 + playerScore)}`;
  const val = playerScore / 100;
  return val >= 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
}
