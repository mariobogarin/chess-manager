import { isKingOnStartSquare, hasCenterFilesOpen } from "@/lib/pgn/parser";
import type { PatternContext, PatternResult } from "./types";

// By move 15 (ply 28-30), the king should ideally be castled
const LATE_CASTLE_PLY = 28;
// Eval drop threshold when center is open and king is still in center
const CENTER_OPEN_KING_DROP = 60;

/**
 * Detects delayed castling / king safety issues:
 * - King remains on e1/e8 past move 15
 * - Center opens with king still in center and eval drops
 *
 * TODO: Future — check if castling rights were still available,
 * and differentiate between voluntary and forced king-in-center.
 */
export function detectKingSafety(ctx: PatternContext): PatternResult {
  const { moveAnalyses, plies, playerColor } = ctx;
  const moveTags = new Map<number, string[]>();
  const gameFindings = [];
  const playerPatterns = [];

  let lateKingFlagged = false;
  let centerDangerFlagged = false;

  for (const ma of moveAnalyses) {
    const ply = plies.find((p) => p.plyIndex === ma.plyIndex);
    if (!ply || ply.color !== playerColor) continue;

    // Check: king still in center after move 15
    if (ply.plyIndex >= LATE_CASTLE_PLY && !lateKingFlagged) {
      const kingStillCenter = isKingOnStartSquare(ply.fenAfter, playerColor);
      const centerOpen = hasCenterFilesOpen(ply.fenAfter);

      if (kingStillCenter && centerOpen && ma.evalLoss !== null && ma.evalLoss >= CENTER_OPEN_KING_DROP) {
        lateKingFlagged = true;
        const existing = moveTags.get(ply.plyIndex) ?? [];
        moveTags.set(ply.plyIndex, [...existing, "delayed_castling"]);

        gameFindings.push({
          phase: "middlegame" as const,
          label: "Delayed king safety",
          description: "Your king stayed in the center too long while the position opened up.",
          patternKey: "delayed_castling",
        });
        playerPatterns.push({
          key: "delayed_castling",
          label: "Delayed castling",
          description: "Keeping the king in the center as the position opens, risking a kingside attack.",
        });
      }
    }

    // Check: king in center with center files open (earlier version)
    if (!centerDangerFlagged && ply.plyIndex >= 16 && ply.plyIndex < LATE_CASTLE_PLY) {
      const kingStillCenter = isKingOnStartSquare(ply.fenBefore, playerColor);
      if (kingStillCenter && hasCenterFilesOpen(ply.fenBefore)) {
        centerDangerFlagged = true;
        // Only tag if there's a notable eval problem
        if (ma.evalLoss !== null && ma.evalLoss >= CENTER_OPEN_KING_DROP) {
          const existing = moveTags.get(ply.plyIndex) ?? [];
          moveTags.set(ply.plyIndex, [...existing, "king_center_danger"]);
        }
      }
    }
  }

  return { moveTags, gameFindings, playerPatterns };
}
