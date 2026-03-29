// Deterministic feedback templates keyed by pattern tag.
// No LLM. All explanations are rule-based.

export interface ExplanationContext {
  san?: string;      // e.g. "Bxf7+"
  color?: "w" | "b";
  evalLoss?: number; // in centipawns
}

const TEMPLATES: Record<string, (ctx: ExplanationContext) => string> = {
  hanging_piece: ({ san }) =>
    san
      ? `After ${san}, you left a piece undefended. Your opponent could capture it for free.`
      : "You left a piece undefended here. Your opponent could capture it for free.",

  ignoring_threat: ({ san }) =>
    san
      ? `With ${san}, you ignored a direct threat from your opponent. You needed to defend first.`
      : "You ignored a direct threat from your opponent and made an unrelated move.",

  delayed_castling: () =>
    "Your king stayed in the center too long. Castle earlier to keep your king safe.",

  king_center_danger: () =>
    "The center opened up with your king still exposed. Consider castling to get to safety.",

  same_piece_repeated: ({ san }) =>
    san
      ? `Moving the same piece again with ${san} wastes a development tempo. Develop other pieces first.`
      : "You spent too much time moving the same piece in the opening. Develop your other pieces instead.",

  poor_development: () =>
    "Several of your pieces were still on their starting squares by move 10. Develop your knights and bishops before pushing pawns.",

  early_queen: ({ san }) =>
    san
      ? `Bringing the queen out with ${san} this early invites your opponent to chase it around and gain tempo.`
      : "Developing the queen this early is usually premature. Develop minor pieces first.",

  squandered_advantage: ({ evalLoss }) =>
    evalLoss !== undefined && evalLoss > 0
      ? `You had a winning position but gave away ${(evalLoss / 100).toFixed(1)} pawns of advantage here.`
      : "You had a winning position and let the advantage slip with this move.",

  // Classification-based fallbacks
  blunder: ({ san, evalLoss }) =>
    san && evalLoss
      ? `${san} was a blunder — you lost about ${(evalLoss / 100).toFixed(1)} pawns of advantage.`
      : "This was a blunder. A much better move was available.",

  mistake: ({ san, evalLoss }) =>
    san && evalLoss
      ? `${san} was a mistake, losing roughly ${(evalLoss / 100).toFixed(1)} pawns.`
      : "This was a mistake. Consider what threats the position offered.",

  inaccuracy: ({ san }) =>
    san
      ? `${san} was slightly inaccurate. There was a more precise option available.`
      : "This move was slightly inaccurate. A more precise choice was available.",
};

/** Generate a short, human-readable explanation for a given pattern tag. */
export function generateExplanation(
  tag: string,
  ctx: ExplanationContext = {}
): string {
  const template = TEMPLATES[tag];
  if (template) return template(ctx);

  // Fallback for unknown tags
  return "Consider reviewing this move more carefully.";
}

/** Generate explanation from classification when no pattern tag is available. */
export function generateClassificationExplanation(
  classification: string,
  ctx: ExplanationContext = {}
): string {
  if (classification === "blunder") return generateExplanation("blunder", ctx);
  if (classification === "mistake") return generateExplanation("mistake", ctx);
  if (classification === "inaccuracy") return generateExplanation("inaccuracy", ctx);
  return "";
}

export const PATTERN_LABELS: Record<string, string> = {
  hanging_piece: "Hanging Piece",
  ignoring_threat: "Ignored Threat",
  delayed_castling: "Delayed Castling",
  king_center_danger: "King in Center",
  same_piece_repeated: "Repeated Piece Move",
  poor_development: "Slow Development",
  early_queen: "Early Queen",
  squandered_advantage: "Lost Advantage",
};
