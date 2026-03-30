"use client";

import Link from "next/link";
import type { Game, GameAnalysisSummary } from "@prisma/client";

interface GameWithSummary extends Game {
  analysisSummary: Pick<GameAnalysisSummary, "analyzedAt" | "resultCategory" | "majorFindings" | "whiteAccuracy" | "blackAccuracy"> | null;
}

interface Props {
  game: GameWithSummary;
  playerUsername: string;
}

const RESULT_STYLES = {
  win: "bg-green-100 text-green-800 border-green-200",
  loss: "bg-red-100 text-red-800 border-red-200",
  draw: "bg-gray-100 text-gray-700 border-gray-200",
};

export function GameCard({ game, playerUsername }: Props) {
  const isWhite = game.whiteUsername.toLowerCase() === playerUsername.toLowerCase();
  const playerRating = isWhite ? game.whiteRating : game.blackRating;
  const opponentUsername = isWhite ? game.blackUsername : game.whiteUsername;
  const opponentRating = isWhite ? game.blackRating : game.whiteRating;

  const resultStyle = RESULT_STYLES[game.result as keyof typeof RESULT_STYLES] ?? RESULT_STYLES.draw;
  const analyzed = !!game.analysisSummary;

  const accuracy = analyzed
    ? (isWhite ? game.analysisSummary?.whiteAccuracy : game.analysisSummary?.blackAccuracy) ?? null
    : null;

  function accuracyColor(acc: number): string {
    if (acc >= 90) return "text-green-700 bg-green-50 border-green-200";
    if (acc >= 75) return "text-blue-700 bg-blue-50 border-blue-200";
    if (acc >= 60) return "text-yellow-700 bg-yellow-50 border-yellow-200";
    return "text-red-700 bg-red-50 border-red-200";
  }

  const findings: string[] = game.analysisSummary?.majorFindings
    ? JSON.parse(game.analysisSummary.majorFindings)
    : [];

  return (
    <Link href={`/game/${game.id}`} className="block">
      <div className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold uppercase ${resultStyle}`}>
                {game.result}
              </span>
              <span className="text-xs text-gray-500">
                {isWhite ? "White" : "Black"}
              </span>
              {game.timeControl && (
                <span className="text-xs text-gray-400">{game.timeControl}</span>
              )}
              {analyzed ? (
                <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                  Analyzed
                </span>
              ) : (
                <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                  Not analyzed
                </span>
              )}
            </div>
            <div className="text-sm font-medium text-gray-900">
              {playerUsername}{" "}
              <span className="text-gray-400 text-xs">({playerRating ?? "?"})</span>
              <span className="text-gray-400 mx-2">vs</span>
              {opponentUsername}{" "}
              <span className="text-gray-400 text-xs">({opponentRating ?? "?"})</span>
            </div>
            {game.opening && (
              <div className="text-xs text-gray-500 mt-0.5 truncate">{game.opening}</div>
            )}
            {findings.length > 0 && (
              <div className="mt-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 truncate">
                {findings[0]}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {accuracy !== null && (
              <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${accuracyColor(accuracy)}`}>
                {accuracy.toFixed(1)}%
              </span>
            )}
            <span className="text-xs text-gray-400">
              {game.endTime
                ? new Date(game.endTime).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : ""}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
