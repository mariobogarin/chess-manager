import { Chess } from "chess.js";

/**
 * Convert a UCI move string (e.g. "e2e4", "e7e8q") to SAN notation
 * given the position FEN before the move.
 * Returns null on any failure — callers must handle gracefully.
 */
export function uciToSan(fenBefore: string, uci: string): string | null {
  if (!uci || uci.length < 4) return null;
  try {
    const chess = new Chess(fenBefore);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length === 5
      ? (uci[4] as "q" | "r" | "b" | "n")
      : undefined;

    const move = chess.move({ from, to, promotion });
    return move.san;
  } catch {
    return null;
  }
}

/**
 * Convert a sequence of UCI moves (principal variation) into SAN,
 * replaying from the given starting FEN.
 * Stops at the first illegal or unparseable move.
 */
export function uciLineToSanLine(fenBefore: string, uciMoves: string[]): string[] {
  if (!uciMoves.length) return [];
  try {
    const chess = new Chess(fenBefore);
    const sanMoves: string[] = [];

    for (const uci of uciMoves) {
      if (!uci || uci.length < 4) break;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length === 5
        ? (uci[4] as "q" | "r" | "b" | "n")
        : undefined;

      const move = chess.move({ from, to, promotion });
      if (!move) break;
      sanMoves.push(move.san);
    }

    return sanMoves;
  } catch {
    return [];
  }
}

/** Build a UCI string from from/to/promotion fields. */
export function toUci(from: string, to: string, promotion?: string): string {
  return `${from}${to}${promotion ?? ""}`;
}
