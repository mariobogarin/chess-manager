import type { GamePhase } from "./gamePhase";

// Minor-piece starting squares
const WHITE_MINOR_START = new Set(["b1", "c1", "f1", "g1"]);
const BLACK_MINOR_START = new Set(["b8", "c8", "f8", "g8"]);
const CASTLING_UCIS = new Set(["e1g1", "e1c1", "e8g8", "e8c8"]);

export interface TagInput {
  phase: GamePhase;
  playerColor: "w" | "b";
  evalLoss: number;              // cp, player perspective, positive = bad
  evalBeforePlayer: number;      // cp, player perspective
  evalAfterPlayer: number;       // cp, player perspective
  bestMoveUci: string | null;
  actualFrom: string;            // from-square of the actual move
  actualPiece: string;           // piece type of the actual move (n/b/r/q/k/p)
  pvLength: number;              // length of engine's principal variation
}

/**
 * Deterministic tag detection.
 * Returns a list of tags describing why the move was bad.
 *
 * Tags:
 *   lost_advantage       — player was clearly winning, now isn't
 *   missed_castling      — best move was castling
 *   hung_piece           — large drop suggesting material loss
 *   missed_tactic        — tactical sequence missed (sharp PV, big drop)
 *   missed_threat        — opponent threat not addressed
 *   missed_development   — opening phase: better developing move was available
 *   passive_move         — moderate loss with no clear tactical reason
 */
export function detectTags(input: TagInput): string[] {
  const {
    phase,
    playerColor,
    evalLoss,
    evalBeforePlayer,
    evalAfterPlayer,
    bestMoveUci,
    actualFrom,
    actualPiece,
    pvLength,
  } = input;

  const tags: string[] = [];

  // lost_advantage: was clearly winning, now isn't
  if (evalBeforePlayer >= 150 && evalAfterPlayer < 50) {
    tags.push("lost_advantage");
  }

  // missed_castling: engine suggested castling
  if (bestMoveUci && CASTLING_UCIS.has(bestMoveUci)) {
    tags.push("missed_castling");
  }

  // hung_piece: large eval drop — material likely lost
  if (evalLoss >= 200) {
    tags.push("hung_piece");
  }

  // missed_tactic: sharp PV + large collapse
  if (evalLoss >= 150 && pvLength >= 3) {
    tags.push("missed_tactic");
  }

  // missed_threat: significant drop, less severe than tactic
  if (evalLoss >= 100 && evalLoss < 200 && pvLength >= 2 && !tags.includes("missed_tactic")) {
    tags.push("missed_threat");
  }

  // missed_development: opening, best move is a developing move but actual isn't
  if (phase === "opening" && evalLoss >= 40 && bestMoveUci) {
    const bestFrom = bestMoveUci.slice(0, 2);
    const startSquares = playerColor === "w" ? WHITE_MINOR_START : BLACK_MINOR_START;
    const bestIsDeveloping = startSquares.has(bestFrom);
    const actualIsDeveloping = startSquares.has(actualFrom) && (actualPiece === "n" || actualPiece === "b");
    if (bestIsDeveloping && !actualIsDeveloping) {
      tags.push("missed_development");
    }
  }

  // passive_move: moderate loss with no more specific reason yet
  if (evalLoss >= 50 && tags.length === 0) {
    tags.push("passive_move");
  }

  return tags;
}

export const TAG_LABELS: Record<string, string> = {
  lost_advantage: "Lost Advantage",
  missed_castling: "Missed Castling",
  hung_piece: "Hanging Piece",
  missed_tactic: "Missed Tactic",
  missed_threat: "Missed Threat",
  missed_development: "Missed Development",
  passive_move: "Passive Move",
  // Legacy tags from pattern system (kept for backward compat in UI)
  hanging_piece: "Hanging Piece",
  ignoring_threat: "Ignored Threat",
  delayed_castling: "Delayed Castling",
  king_center_danger: "King in Center",
  same_piece_repeated: "Repeated Move",
  poor_development: "Slow Development",
  early_queen: "Early Queen",
  squandered_advantage: "Lost Advantage",
};
