"use client";

import { Chessboard } from "react-chessboard";
import type { Ply } from "@/lib/pgn/parser";

interface Props {
  fen: string;
  currentPly: Ply | null;
  orientation?: "white" | "black";
  onPrevMove: () => void;
  onNextMove: () => void;
  onGoToStart: () => void;
  onGoToEnd: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export function BoardView({
  fen,
  currentPly,
  orientation = "white",
  onPrevMove,
  onNextMove,
  onGoToStart,
  onGoToEnd,
  canGoPrev,
  canGoNext,
}: Props) {
  // Highlight from/to squares of current move
  const customSquareStyles: Record<string, React.CSSProperties> = {};
  if (currentPly) {
    customSquareStyles[currentPly.from] = {
      backgroundColor: "rgba(255, 214, 10, 0.4)",
    };
    customSquareStyles[currentPly.to] = {
      backgroundColor: "rgba(255, 214, 10, 0.5)",
    };
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden shadow-md border border-gray-200">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            squareStyles: customSquareStyles,
            allowDragging: false,
            boardStyle: { borderRadius: "4px" },
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-1">
        <ControlButton onClick={onGoToStart} disabled={!canGoPrev} title="Start">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
          </svg>
        </ControlButton>
        <ControlButton onClick={onPrevMove} disabled={!canGoPrev} title="Previous">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
          </svg>
        </ControlButton>
        <ControlButton onClick={onNextMove} disabled={!canGoNext} title="Next">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
          </svg>
        </ControlButton>
        <ControlButton onClick={onGoToEnd} disabled={!canGoNext} title="End">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11.555 5.168A1 1 0 0010 6v2.798L4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z" />
          </svg>
        </ControlButton>
      </div>

      {/* Current move display */}
      {currentPly && (
        <div className="text-center text-sm text-gray-500">
          Move {currentPly.moveNumber}{currentPly.color === "b" ? "..." : "."} {currentPly.san}
        </div>
      )}
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
