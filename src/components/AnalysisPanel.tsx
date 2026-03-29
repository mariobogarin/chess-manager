"use client";

import type { MoveAnalysis } from "@prisma/client";
import type { Ply } from "@/lib/pgn/parser";
import { ClassificationBadge } from "./ClassificationBadge";
import { PatternBadge } from "./PatternBadge";
import { evalDisplay as evalDisplayFn } from "@/lib/analysis/classifier";
import { TAG_LABELS } from "@/lib/analysis/tags";

interface Props {
  ply: Ply | null;
  analysis: MoveAnalysis | null;
  playerColor: "w" | "b";
}

export function AnalysisPanel({ ply, analysis, playerColor }: Props) {
  if (!ply) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        Select a move to see analysis.
      </div>
    );
  }

  const isPlayerMove = ply.color === playerColor;
  const tags: string[] = analysis?.detectedTags ? JSON.parse(analysis.detectedTags) : [];
  const pv: string[] = analysis?.principalVariation ? JSON.parse(analysis.principalVariation) : [];

  const evalAfterDisplay = analysis?.evalAfter !== null && analysis?.evalAfter !== undefined
    ? evalDisplayFn(analysis.evalAfter, playerColor)
    : null;

  const evalLossDisplay =
    analysis?.evalLoss !== null && analysis?.evalLoss !== undefined && analysis.evalLoss > 5
      ? `−${(analysis.evalLoss / 100).toFixed(1)}`
      : null;

  const showBestMove =
    isPlayerMove &&
    analysis?.classification &&
    ["blunder", "mistake", "inaccuracy"].includes(analysis.classification);

  const isKeyMove = analysis?.isKeyMove ?? false;

  return (
    <div className={`rounded-lg border bg-white p-4 space-y-3 ${
      isKeyMove && isPlayerMove ? "border-red-200 ring-1 ring-red-100" : "border-gray-200"
    }`}>
      {/* Header: move + classification + eval */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-gray-900">
            {ply.moveNumber}{ply.color === "w" ? "." : "…"} {ply.san}
          </span>
          {isPlayerMove && analysis?.classification && (
            <ClassificationBadge classification={analysis.classification} size="md" />
          )}
          {isKeyMove && isPlayerMove && (
            <span className="text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5">
              Key moment
            </span>
          )}
        </div>
        {evalAfterDisplay && (
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-400 mb-0.5">After move</div>
            <div className="font-mono text-sm font-medium text-gray-700">
              {evalAfterDisplay}
              {evalLossDisplay && (
                <span className="ml-1 text-red-500 text-xs">{evalLossDisplay}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Key reason */}
      {isKeyMove && analysis?.keyReason && (
        <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          {analysis.keyReason}
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <PatternBadge key={tag} tag={tag} />
          ))}
        </div>
      )}

      {/* Explanation */}
      {analysis?.explanationShort && (
        <p className="text-sm text-gray-700 leading-relaxed bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {analysis.explanationShort}
        </p>
      )}

      {/* Best move */}
      {showBestMove && (analysis?.bestMoveSan || analysis?.bestMove) && (
        <div className="text-xs text-gray-500 space-y-0.5">
          <div>
            <span className="font-medium text-gray-700">Best move: </span>
            <span className="font-mono text-green-700 font-semibold">
              {analysis.bestMoveSan ?? analysis.bestMove}
            </span>
          </div>
          {pv.length > 1 && (
            <div className="font-mono text-gray-400">
              {pv.slice(1, 5).join(" ")}{pv.length > 5 ? "…" : ""}
            </div>
          )}
        </div>
      )}

      {!analysis && isPlayerMove && (
        <p className="text-xs text-gray-400 italic">
          No analysis yet. Analyze this game to see move evaluations.
        </p>
      )}
    </div>
  );
}
