"use client";

import type { MoveAnalysis } from "@prisma/client";
import type { Ply } from "@/lib/pgn/parser";
import { ClassificationBadge } from "./ClassificationBadge";

interface Props {
  plies: Ply[];
  moveAnalyses: MoveAnalysis[];
  currentPlyIndex: number;
  onSelectPly: (index: number) => void;
  playerColor: "w" | "b";
}

export function MoveList({
  plies,
  moveAnalyses,
  currentPlyIndex,
  onSelectPly,
  playerColor,
}: Props) {
  const analysisMap = new Map(moveAnalyses.map((ma) => [ma.plyIndex, ma]));

  const movePairs: { moveNumber: number; white?: Ply; black?: Ply }[] = [];
  for (const ply of plies) {
    if (ply.color === "w") {
      movePairs.push({ moveNumber: ply.moveNumber, white: ply });
    } else {
      const last = movePairs[movePairs.length - 1];
      if (last && last.moveNumber === ply.moveNumber) {
        last.black = ply;
      } else {
        movePairs.push({ moveNumber: ply.moveNumber, black: ply });
      }
    }
  }

  return (
    <div className="overflow-y-auto">
      <table className="w-full text-sm">
        <tbody>
          {movePairs.map((pair) => (
            <tr key={pair.moveNumber} className="border-b border-gray-100 last:border-0">
              <td className="py-1 px-2 text-gray-400 font-mono text-xs w-8 select-none">
                {pair.moveNumber}.
              </td>
              <MoveCell
                ply={pair.white}
                analysis={pair.white ? analysisMap.get(pair.white.plyIndex) : undefined}
                isActive={pair.white?.plyIndex === currentPlyIndex}
                isPlayerMove={pair.white?.color === playerColor}
                onClick={() => pair.white && onSelectPly(pair.white.plyIndex)}
              />
              <MoveCell
                ply={pair.black}
                analysis={pair.black ? analysisMap.get(pair.black.plyIndex) : undefined}
                isActive={pair.black?.plyIndex === currentPlyIndex}
                isPlayerMove={pair.black?.color === playerColor}
                onClick={() => pair.black && onSelectPly(pair.black.plyIndex)}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Symbols shown inline in the move list for mistake severity
const CLASSIFICATION_SYMBOLS: Partial<Record<string, string>> = {
  blunder: "??",
  mistake: "?",
  inaccuracy: "?!",
};

function MoveCell({
  ply,
  analysis,
  isActive,
  isPlayerMove,
  onClick,
}: {
  ply?: Ply;
  analysis?: MoveAnalysis;
  isActive: boolean;
  isPlayerMove: boolean;
  onClick: () => void;
}) {
  if (!ply) return <td className="py-1 px-1" />;

  const classification = analysis?.classification;
  const isKeyMove = analysis?.isKeyMove ?? false;
  const symbol = isPlayerMove && classification ? CLASSIFICATION_SYMBOLS[classification] : undefined;

  const bgClass = isActive
    ? "bg-blue-600 text-white"
    : isKeyMove && isPlayerMove
    ? "bg-red-50 hover:bg-red-100"
    : "hover:bg-gray-100";

  return (
    <td className="py-1 px-1">
      <button
        onClick={onClick}
        title={isKeyMove ? analysis?.keyReason ?? "Key moment" : undefined}
        className={`w-full text-left px-2 py-1 rounded transition-colors font-mono relative ${bgClass}`}
      >
        {/* Key move indicator dot */}
        {isKeyMove && isPlayerMove && !isActive && (
          <span className="absolute left-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500" />
        )}
        <span className={`${isActive ? "text-white" : "text-gray-800"} ${isKeyMove && !isActive ? "pl-2" : ""}`}>
          {ply.san}
        </span>
        {isPlayerMove && symbol && (
          <span className={`ml-0.5 font-bold text-xs ${
            isActive ? "text-white/80" : classification === "blunder" ? "text-red-500" : "text-orange-500"
          }`}>
            {symbol}
          </span>
        )}
      </button>
    </td>
  );
}
