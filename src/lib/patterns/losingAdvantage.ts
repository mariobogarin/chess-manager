import type { PatternContext, PatternResult } from "./types";

// Clearly winning: advantage > 200 cp
const WINNING_THRESHOLD = 200;
// Threw it away: eval dropped by > 300 cp from peak
const ADVANTAGE_LOST_THRESHOLD = 300;

/**
 * Detects games where the player reached a clearly winning position
 * but subsequently let the advantage slip significantly.
 *
 * TODO: Future — track if the game was eventually lost after the advantage
 * was squandered, and distinguish between gradual erosion vs. single blunder.
 */
export function detectLosingAdvantage(ctx: PatternContext): PatternResult {
  const { moveAnalyses, plies, playerColor } = ctx;
  const moveTags = new Map<number, string[]>();
  const gameFindings = [];
  const playerPatterns = [];

  let peakAdvantage = -Infinity;
  let peakPlyIndex = -1;
  let foundLosingAdvantage = false;

  for (const ma of moveAnalyses) {
    const ply = plies.find((p) => p.plyIndex === ma.plyIndex);
    if (!ply || ply.color !== playerColor) continue;
    if (ma.evalBefore === null) continue;

    // Eval from player's perspective
    const playerEval = playerColor === "w" ? ma.evalBefore : -(ma.evalBefore);

    if (playerEval > peakAdvantage) {
      peakAdvantage = playerEval;
      peakPlyIndex = ply.plyIndex;
    }

    // Check if we had a winning advantage and then dropped significantly
    if (
      !foundLosingAdvantage &&
      peakAdvantage >= WINNING_THRESHOLD &&
      ma.evalLoss !== null &&
      playerEval < peakAdvantage - ADVANTAGE_LOST_THRESHOLD
    ) {
      foundLosingAdvantage = true;

      const existing = moveTags.get(ply.plyIndex) ?? [];
      moveTags.set(ply.plyIndex, [...existing, "squandered_advantage"]);

      const phase: "opening" | "middlegame" | "endgame" =
        ply.plyIndex < 20 ? "opening" : ply.plyIndex < 60 ? "middlegame" : "endgame";

      gameFindings.push({
        phase,
        label: "Winning advantage lost",
        description: `You had a winning position (+${(peakAdvantage / 100).toFixed(1)}) but let the advantage slip.`,
        patternKey: "squandered_advantage",
      });
      playerPatterns.push({
        key: "squandered_advantage",
        label: "Squandering advantages",
        description: "Reaching clearly winning positions but failing to convert them.",
      });
    }
  }

  return { moveTags, gameFindings, playerPatterns };
}
