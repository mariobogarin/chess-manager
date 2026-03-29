import type { MoveAnalysis } from "@prisma/client";
import type { Ply } from "@/lib/pgn/parser";

export interface PatternContext {
  moveAnalyses: MoveAnalysis[];
  plies: Ply[];
  playerColor: "w" | "b";
}

export interface MoveTags {
  [plyIndex: number]: string[];
}

export interface GameFinding {
  phase: "opening" | "middlegame" | "endgame";
  label: string;
  description: string;
  patternKey: string;
}

export interface PatternResult {
  moveTags: Map<number, string[]>;
  gameFindings: GameFinding[];
  playerPatterns: { key: string; label: string; description: string }[];
}

export type PatternDetector = (ctx: PatternContext) => PatternResult;
