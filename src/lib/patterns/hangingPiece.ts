import type { PatternContext, PatternResult } from "./types";

// Threshold: eval drop > 150 cp on a player move suggests material loss
const HANGING_EVAL_DROP = 150;

/**
 * Detects moves where a sharp evaluation drop suggests the player left
 * material hanging or lost material shortly after.
 *
 * TODO: Future — use chess.js board state to verify which piece was actually
 * left undefended rather than relying solely on eval drop.
 */
export function detectHangingPiece(ctx: PatternContext): PatternResult {
  const { moveAnalyses, plies, playerColor } = ctx;
  const moveTags = new Map<number, string[]>();
  const gameFindings = [];
  const playerPatterns = [];

  let found = false;

  for (const ma of moveAnalyses) {
    const ply = plies.find((p) => p.plyIndex === ma.plyIndex);
    if (!ply || ply.color !== playerColor) continue;
    if (ma.evalLoss === null) continue;

    if (ma.evalLoss >= HANGING_EVAL_DROP) {
      const existing = moveTags.get(ma.plyIndex) ?? [];
      moveTags.set(ma.plyIndex, [...existing, "hanging_piece"]);

      if (!found) {
        found = true;
        gameFindings.push({
          phase: (ply.plyIndex < 20 ? "opening" : ply.plyIndex < 60 ? "middlegame" : "endgame") as "opening" | "middlegame" | "endgame",
          label: "Hanging piece",
          description: "You left a piece undefended, losing material.",
          patternKey: "hanging_piece",
        });
        playerPatterns.push({
          key: "hanging_piece",
          label: "Hanging piece",
          description: "Leaving pieces undefended, allowing the opponent to capture for free.",
        });
      }
    }
  }

  return { moveTags, gameFindings, playerPatterns };
}
