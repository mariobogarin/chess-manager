import type { MoveAnalysis } from "@prisma/client";
import type { Ply } from "@/lib/pgn/parser";
import type { PatternContext, PatternResult } from "./types";
import { detectHangingPiece } from "./hangingPiece";
import { detectIgnoringThreat } from "./ignoringThreat";
import { detectKingSafety } from "./kingSafety";
import { detectOpeningDevelopment } from "./openingDevelopment";
import { detectLosingAdvantage } from "./losingAdvantage";

export type { PatternResult };

const DETECTORS = [
  detectHangingPiece,
  detectIgnoringThreat,
  detectKingSafety,
  detectOpeningDevelopment,
  detectLosingAdvantage,
];

/** Run all pattern detectors and merge their results. */
export function detectPatterns(
  moveAnalyses: MoveAnalysis[],
  plies: Ply[],
  playerColor: "w" | "b"
): PatternResult {
  const ctx: PatternContext = { moveAnalyses, plies, playerColor };

  const merged: PatternResult = {
    moveTags: new Map(),
    gameFindings: [],
    playerPatterns: [],
  };

  for (const detector of DETECTORS) {
    const result = detector(ctx);

    // Merge moveTags
    for (const [plyIndex, tags] of result.moveTags) {
      const existing = merged.moveTags.get(plyIndex) ?? [];
      merged.moveTags.set(plyIndex, [...new Set([...existing, ...tags])]);
    }

    // Merge game findings (deduplicate by patternKey)
    for (const finding of result.gameFindings) {
      if (!merged.gameFindings.find((f) => f.patternKey === finding.patternKey)) {
        merged.gameFindings.push(finding);
      }
    }

    // Merge player patterns (deduplicate by key)
    for (const pattern of result.playerPatterns) {
      if (!merged.playerPatterns.find((p) => p.key === pattern.key)) {
        merged.playerPatterns.push(pattern);
      }
    }
  }

  return merged;
}
