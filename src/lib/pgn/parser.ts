import { Chess } from "chess.js";

export interface PgnHeaders {
  white?: string;
  black?: string;
  whiteElo?: string;
  blackElo?: string;
  result?: string;
  eco?: string;
  opening?: string;
  event?: string;
  date?: string;
  timeControl?: string;
  termination?: string;
}

export interface Ply {
  plyIndex: number;   // 0-based half-move index
  moveNumber: number; // chess move number (1-based)
  color: "w" | "b";
  san: string;
  fenBefore: string;
  fenAfter: string;
  from: string;
  to: string;
  flags: string;
  piece: string;
  captured?: string;
  promotion?: string;
}

export interface ParsedGame {
  headers: PgnHeaders;
  plies: Ply[];
  initialFen: string;
}

export function parsePgn(pgn: string): ParsedGame {
  const chess = new Chess();

  try {
    chess.loadPgn(pgn, { strict: false });
  } catch (err) {
    throw new Error(`Failed to parse PGN: ${err}`);
  }

  // Extract headers
  const rawHeaders = chess.header();
  const headers: PgnHeaders = {
    white: rawHeaders["White"] ?? undefined,
    black: rawHeaders["Black"] ?? undefined,
    whiteElo: rawHeaders["WhiteElo"] ?? undefined,
    blackElo: rawHeaders["BlackElo"] ?? undefined,
    result: rawHeaders["Result"] ?? undefined,
    eco: rawHeaders["ECO"] ?? undefined,
    opening: rawHeaders["Opening"] ?? undefined,
    event: rawHeaders["Event"] ?? undefined,
    date: rawHeaders["Date"] ?? undefined,
    timeControl: rawHeaders["TimeControl"] ?? undefined,
    termination: rawHeaders["Termination"] ?? undefined,
  };

  const initialFen = rawHeaders["FEN"] ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const initialReplayFen = initialFen;

  // Re-load PGN to get history
  const replayChess2 = new Chess();
  try {
    replayChess2.loadPgn(pgn, { strict: false });
  } catch {
    throw new Error("Failed to replay PGN for ply extraction");
  }

  const verboseHistory = replayChess2.history({ verbose: true });

  // Replay from scratch collecting FENs
  const startChess = new Chess(
    rawHeaders["FEN"] ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  );

  const plies: Ply[] = [];

  for (let i = 0; i < verboseHistory.length; i++) {
    const move = verboseHistory[i];
    const fenBefore = startChess.fen();

    startChess.move(move.san);
    const fenAfter = startChess.fen();

    const moveNumber = Math.floor(i / 2) + 1;
    const color = i % 2 === 0 ? "w" : "b";

    plies.push({
      plyIndex: i,
      moveNumber,
      color,
      san: move.san,
      fenBefore,
      fenAfter,
      from: move.from,
      to: move.to,
      flags: move.flags,
      piece: move.piece,
      captured: move.captured,
      promotion: move.promotion,
    });
  }

  return {
    headers,
    plies,
    initialFen: initialReplayFen,
  };
}

/** Given a PGN and ply index, return the FEN at that position. */
export function getFenAtPly(pgn: string, plyIndex: number): string {
  const { plies, initialFen } = parsePgn(pgn);
  if (plyIndex < 0) return initialFen;
  if (plyIndex >= plies.length) return plies[plies.length - 1]?.fenAfter ?? initialFen;
  return plies[plyIndex].fenAfter;
}

/** Count how many minor pieces are undeveloped for a side at a given ply. */
export function countUndevelopedPieces(fen: string, color: "w" | "b"): number {
  const chess = new Chess(fen);
  const board = chess.board();

  // Starting squares for minor pieces
  const startSquares =
    color === "w"
      ? ["b1", "c1", "f1", "g1"] // white knights + bishops
      : ["b8", "c8", "f8", "g8"]; // black knights + bishops

  let undeveloped = 0;
  for (const sq of startSquares) {
    const file = sq.charCodeAt(0) - 97; // a=0
    const rank = parseInt(sq[1]) - 1;   // 1=0
    const piece = board[7 - rank]?.[file];
    if (piece && piece.color === color && (piece.type === "n" || piece.type === "b")) {
      undeveloped++;
    }
  }
  return undeveloped;
}

/** Returns true if the king is still on its starting square (not yet castled). */
export function isKingOnStartSquare(fen: string, color: "w" | "b"): boolean {
  const chess = new Chess(fen);
  const kingSquare = color === "w" ? "e1" : "e8";
  const piece = chess.get(kingSquare as Parameters<typeof chess.get>[0]);
  return piece?.type === "k" && piece?.color === color;
}

/** Check if the position has open center files (e or d file open). */
export function hasCenterFilesOpen(fen: string): boolean {
  const chess = new Chess(fen);
  const eFile = ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"];
  const dFile = ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"];

  const eOpen = eFile.every((sq) => {
    const p = chess.get(sq as Parameters<typeof chess.get>[0]);
    return !p || p.type !== "p";
  });
  const dOpen = dFile.every((sq) => {
    const p = chess.get(sq as Parameters<typeof chess.get>[0]);
    return !p || p.type !== "p";
  });

  return eOpen || dOpen;
}
