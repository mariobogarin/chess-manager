import { Chess } from "chess.js";

export type GamePhase = "opening" | "middlegame" | "endgame";

// Ply thresholds for a fast opening check
const OPENING_PLY_END = 20; // first 10 moves

/**
 * Detect game phase from ply index and FEN.
 *
 * Heuristics (in priority order):
 * 1. First 10 moves → opening
 * 2. No queens on the board → endgame
 * 3. Few pieces remaining (≤ 6 non-king, non-pawn pieces) → endgame
 * 4. Otherwise → middlegame
 */
export function detectPhase(plyIndex: number, fen: string): GamePhase {
  if (plyIndex < OPENING_PLY_END) return "opening";

  try {
    const chess = new Chess(fen);
    const flat = chess.board().flat().filter(Boolean) as { type: string; color: string }[];

    const hasQueens = flat.some((p) => p.type === "q");
    const minorAndMajor = flat.filter((p) => p.type !== "k" && p.type !== "p");

    if (!hasQueens || minorAndMajor.length <= 6) return "endgame";
  } catch {
    // FEN parse failure — fall through to middlegame
  }

  return "middlegame";
}
