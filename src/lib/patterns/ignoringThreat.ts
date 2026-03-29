import type { PatternContext, PatternResult } from "./types";

// If opponent's previous move gained 100+ cp and player didn't respond defensively
const OPPONENT_THREAT_THRESHOLD = 100;
const PLAYER_POOR_RESPONSE_THRESHOLD = 80;

/**
 * Detects cases where:
 * - The opponent made a strong move (gained significant eval advantage)
 * - The player's next move didn't address the threat (continued to worsen)
 *
 * TODO: Future — parse best move to verify it was a defensive move,
 * and check if the player's move was completely unrelated to the threat.
 */
export function detectIgnoringThreat(ctx: PatternContext): PatternResult {
  const { moveAnalyses, plies, playerColor } = ctx;
  const moveTags = new Map<number, string[]>();
  const gameFindings = [];
  const playerPatterns = [];

  const opponentColor = playerColor === "w" ? "b" : "w";
  let found = false;

  for (let i = 1; i < moveAnalyses.length; i++) {
    const prevMa = moveAnalyses[i - 1];
    const curMa = moveAnalyses[i];

    const prevPly = plies.find((p) => p.plyIndex === prevMa.plyIndex);
    const curPly = plies.find((p) => p.plyIndex === curMa.plyIndex);

    if (!prevPly || !curPly) continue;

    // Previous move was opponent's, current is player's
    if (prevPly.color !== opponentColor || curPly.color !== playerColor) continue;

    if (prevMa.evalBefore === null || prevMa.evalAfter === null) continue;
    if (curMa.evalLoss === null) continue;

    // How much did opponent gain on their move?
    const opponentGain =
      playerColor === "w"
        ? prevMa.evalBefore - prevMa.evalAfter  // opponent (black) gaining means white's eval drops
        : prevMa.evalAfter - prevMa.evalBefore;

    if (opponentGain >= OPPONENT_THREAT_THRESHOLD && curMa.evalLoss >= PLAYER_POOR_RESPONSE_THRESHOLD) {
      const existing = moveTags.get(curMa.plyIndex) ?? [];
      moveTags.set(curMa.plyIndex, [...existing, "ignoring_threat"]);

      if (!found) {
        found = true;
        const phase: "opening" | "middlegame" | "endgame" =
          curMa.plyIndex < 20 ? "opening" : curMa.plyIndex < 60 ? "middlegame" : "endgame";
        gameFindings.push({
          phase,
          label: "Ignored opponent threat",
          description: "You ignored a direct threat from your opponent and made an unrelated move.",
          patternKey: "ignoring_threat",
        });
        playerPatterns.push({
          key: "ignoring_threat",
          label: "Ignoring threats",
          description: "Failing to respond to the opponent's threats, allowing them to follow through.",
        });
      }
    }
  }

  return { moveTags, gameFindings, playerPatterns };
}
