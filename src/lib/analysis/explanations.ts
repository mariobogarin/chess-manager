import type { GamePhase } from "./gamePhase";

export interface ExplanationInput {
  tags: string[];
  classification: string | null;
  phase: GamePhase;
  bestMoveSan: string | null;
  evalLoss: number;
  san: string;           // actual move played
  evalBeforePlayer?: number;
  evalAfterPlayer?: number;
}

/**
 * Generate a short, human-readable explanation for a move error.
 * Deterministic: no LLM, pure templates + rule selection.
 *
 * Priority order: most specific tag first, fallback to classification.
 */
export function buildExplanation(input: ExplanationInput): string {
  const { tags, classification, phase, bestMoveSan, evalLoss, san, evalBeforePlayer, evalAfterPlayer } = input;
  const bestHint = bestMoveSan ? ` The better move was ${bestMoveSan}.` : "";
  const lossText = evalLoss >= 10 ? ` (−${(evalLoss / 100).toFixed(1)})` : "";

  // ── Specific tags ───────────────────────────────────────────────────────────

  if (tags.includes("lost_advantage") && evalBeforePlayer !== undefined && evalAfterPlayer !== undefined) {
    const before = `+${(evalBeforePlayer / 100).toFixed(1)}`;
    const after = evalAfterPlayer >= 0
      ? `+${(evalAfterPlayer / 100).toFixed(1)}`
      : (evalAfterPlayer / 100).toFixed(1);
    return `You had a winning position (${before}) and let the advantage slip here.${bestHint}`;
  }

  if (tags.includes("missed_castling")) {
    return `Your king was still exposed in the center. Castling here was safer.${bestHint}`;
  }

  if (tags.includes("hung_piece")) {
    return `After ${san} you left a piece undefended — it can be captured for free.${bestHint}`;
  }

  if (tags.includes("missed_tactic")) {
    return `There was a strong tactical sequence here that you missed.${bestHint}`;
  }

  if (tags.includes("missed_threat")) {
    return `This move ignored a direct threat from your opponent.${bestHint}`;
  }

  if (tags.includes("missed_development")) {
    return `In the opening you missed a good developing move.${bestHint}`;
  }

  if (tags.includes("passive_move")) {
    return `This move was too passive. A more active approach was available${lossText}.${bestHint}`;
  }

  // Legacy pattern tags (backward compat)
  if (tags.includes("hanging_piece") || tags.includes("hung_piece")) {
    return `You left a piece undefended here. Your opponent could capture it for free.${bestHint}`;
  }
  if (tags.includes("ignoring_threat") || tags.includes("missed_threat")) {
    return `You ignored a direct threat from your opponent.${bestHint}`;
  }
  if (tags.includes("delayed_castling") || tags.includes("missed_castling")) {
    return `Your king stayed in the center too long. Castle earlier.${bestHint}`;
  }
  if (tags.includes("squandered_advantage") || tags.includes("lost_advantage")) {
    return `You had a winning position and let it slip.${bestHint}`;
  }
  if (tags.includes("same_piece_repeated")) {
    return `Moving the same piece again wastes development tempo.${bestHint}`;
  }
  if (tags.includes("poor_development")) {
    return `Several pieces were still undeveloped. Develop knights and bishops before pushing pawns.${bestHint}`;
  }
  if (tags.includes("early_queen")) {
    return `Developing the queen this early invites your opponent to chase it and gain tempo.${bestHint}`;
  }

  // ── Fallback to classification ───────────────────────────────────────────────
  if (classification === "blunder") {
    return `This blunder cost${lossText} of your advantage.${bestHint}`;
  }
  if (classification === "mistake") {
    return `This mistake lost about ${(evalLoss / 100).toFixed(1)} pawns.${bestHint}`;
  }
  if (classification === "inaccuracy") {
    return `A slightly inaccurate move. A more precise choice was available.${bestHint}`;
  }

  return `A better option was available here.${bestHint}`;
}
