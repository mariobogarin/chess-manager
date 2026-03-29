"use client";

import type { MoveAnalysis } from "@prisma/client";
import { ClassificationBadge } from "./ClassificationBadge";
import { TAG_LABELS } from "@/lib/analysis/tags";
import { evalDisplay } from "@/lib/analysis/classifier";

interface Props {
  keyMoves: MoveAnalysis[];
  playerColor: "w" | "b";
  onGoToPly: (plyIndex: number) => void;
  currentPlyIndex: number;
}

export function KeyMomentsPanel({ keyMoves, playerColor, onGoToPly, currentPlyIndex }: Props) {
  if (keyMoves.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Key Moments</h3>
        <p className="text-sm text-gray-400 italic">No major mistakes detected in this game.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Key Moments</h3>
        <span className="text-xs text-gray-400">{keyMoves.length} critical mistake{keyMoves.length !== 1 ? "s" : ""}</span>
      </div>
      <ul className="divide-y divide-gray-100">
        {keyMoves.map((ma) => (
          <KeyMomentCard
            key={ma.id}
            ma={ma}
            playerColor={playerColor}
            isActive={currentPlyIndex === ma.plyIndex}
            onGoToPly={onGoToPly}
          />
        ))}
      </ul>
    </div>
  );
}

function KeyMomentCard({
  ma,
  playerColor,
  isActive,
  onGoToPly,
}: {
  ma: MoveAnalysis;
  playerColor: "w" | "b";
  isActive: boolean;
  onGoToPly: (plyIndex: number) => void;
}) {
  const tags: string[] = JSON.parse(ma.detectedTags || "[]");
  const pv: string[] = JSON.parse(ma.principalVariation || "[]");
  const moveLabel = `${ma.moveNumber}${ma.side === "w" ? "." : "..."} ${ma.san}`;

  // Eval swing display (player perspective)
  const evalBefore = ma.evalBefore !== null ? evalDisplay(ma.evalBefore, playerColor) : null;
  const evalAfter = ma.evalAfter !== null ? evalDisplay(ma.evalAfter, playerColor) : null;

  const evalLossText =
    ma.evalLoss !== null && ma.evalLoss > 5
      ? `−${(ma.evalLoss / 100).toFixed(1)}`
      : null;

  return (
    <li
      className={`p-4 transition-colors ${
        isActive ? "bg-blue-50 border-l-2 border-blue-500" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: move info */}
        <div className="flex-1 min-w-0">
          {/* Move + classification */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="font-mono font-semibold text-gray-900">{moveLabel}</span>
            <ClassificationBadge classification={ma.classification} size="sm" />
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5"
              >
                {TAG_LABELS[tag] ?? tag}
              </span>
            ))}
          </div>

          {/* Eval swing */}
          {evalBefore && evalAfter && (
            <div className="flex items-center gap-1.5 text-xs mb-2">
              <span className="font-mono text-gray-600">{evalBefore}</span>
              <span className="text-gray-400">→</span>
              <span className={`font-mono font-medium ${
                ma.evalAfter !== null && (playerColor === "w" ? ma.evalAfter : -ma.evalAfter) < -50
                  ? "text-red-600"
                  : "text-gray-700"
              }`}>{evalAfter}</span>
              {evalLossText && (
                <span className="text-red-500 font-medium ml-1">{evalLossText}</span>
              )}
            </div>
          )}

          {/* Best move */}
          {ma.bestMoveSan && (
            <div className="text-xs text-gray-500 mb-1.5">
              <span className="font-medium text-gray-700">Best:</span>{" "}
              <span className="font-mono text-green-700">{ma.bestMoveSan}</span>
              {pv.length > 1 && (
                <span className="text-gray-400 font-mono ml-1">
                  {pv.slice(1, 4).join(" ")}
                  {pv.length > 4 ? "…" : ""}
                </span>
              )}
            </div>
          )}

          {/* Explanation */}
          {ma.explanationShort && (
            <p className="text-xs text-gray-600 leading-relaxed">{ma.explanationShort}</p>
          )}

          {/* Key reason */}
          {ma.keyReason && (
            <p className="text-xs text-amber-700 mt-1 font-medium">{ma.keyReason}</p>
          )}
        </div>

        {/* Right: Go to position button */}
        <button
          onClick={() => onGoToPly(ma.plyIndex)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            isActive
              ? "bg-blue-600 text-white"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-blue-400"
          }`}
        >
          {isActive ? "Viewing" : "Go to"}
        </button>
      </div>
    </li>
  );
}
