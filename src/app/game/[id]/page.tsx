"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Game, MoveAnalysis, GameAnalysisSummary } from "@prisma/client";
import type { Ply } from "@/lib/pgn/parser";
import { MoveList } from "@/components/MoveList";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { KeyMomentsPanel } from "@/components/KeyMomentsPanel";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const BoardView = dynamic(
  () => import("@/components/BoardView").then((m) => m.BoardView),
  { ssr: false, loading: () => <div className="w-[480px] h-[480px] bg-gray-100 rounded-lg animate-pulse" /> }
);

interface GameDetail extends Game {
  analysisSummary: GameAnalysisSummary | null;
  moveAnalyses: MoveAnalysis[];
  playerProfile: { username: string };
}

interface GameResponse {
  game: GameDetail;
  plies: Ply[];
}

export default function GamePage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<GameResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlyIndex, setCurrentPlyIndex] = useState(-1);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeStatus, setAnalyzeStatus] = useState<string | null>(null);

  async function fetchGame() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${id}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to load game");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchGame(); }, [id]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!data) return;
      if (e.key === "ArrowLeft") setCurrentPlyIndex((i) => Math.max(-1, i - 1));
      else if (e.key === "ArrowRight") setCurrentPlyIndex((i) => Math.min(data.plies.length - 1, i + 1));
      else if (e.key === "Home") setCurrentPlyIndex(-1);
      else if (e.key === "End") setCurrentPlyIndex(data.plies.length - 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [data]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeStatus("Starting analysis...");
    try {
      const res = await fetch(`/api/games/${id}/analyze`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        setAnalyzeError(d.hint ? `${d.error}. ${d.hint}` : (d.error ?? "Analysis failed"));
      } else {
        setAnalyzeStatus("Analysis complete!");
        await fetchGame();
      }
    } catch {
      setAnalyzeError("Network error during analysis");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading game..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">{error ?? "Game not found"}</div>
          <Link href="/" className="text-blue-600 hover:underline text-sm">← Back</Link>
        </div>
      </div>
    );
  }

  const { game, plies } = data;
  const playerUsername = game.playerProfile.username;
  const playerColor: "w" | "b" =
    game.whiteUsername.toLowerCase() === playerUsername.toLowerCase() ? "w" : "b";

  const analysisMap = new Map(game.moveAnalyses.map((ma) => [ma.plyIndex, ma]));
  const currentPly = currentPlyIndex >= 0 ? plies[currentPlyIndex] ?? null : null;
  const currentAnalysis = currentPly ? analysisMap.get(currentPly.plyIndex) ?? null : null;

  const currentFen =
    currentPlyIndex < 0
      ? (game.initialFen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
      : (plies[currentPlyIndex]?.fenAfter ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

  const hasAnalysis = game.moveAnalyses.length > 0;

  // Key moments: player moves flagged as key, sorted chronologically
  const keyMoves = game.moveAnalyses
    .filter((ma) => ma.isKeyMove && ma.side === playerColor)
    .sort((a, b) => a.plyIndex - b.plyIndex);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/${playerUsername}`} className="text-gray-400 hover:text-gray-700 text-sm">
              ← Dashboard
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-700">
              {game.whiteUsername} vs {game.blackUsername}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!hasAnalysis && !analyzing && (
              <button onClick={handleAnalyze} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                Analyze game
              </button>
            )}
            {hasAnalysis && !analyzing && (
              <button onClick={handleAnalyze} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Re-analyze
              </button>
            )}
            {analyzing && <LoadingSpinner size="sm" label="Analyzing..." />}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Game metadata bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-gray-500">White: </span>
              <span className={`font-medium ${playerColor === "w" ? "text-blue-700" : "text-gray-800"}`}>
                {game.whiteUsername}
              </span>
              <span className="text-gray-400 ml-1">({game.whiteRating ?? "?"})</span>
            </div>
            <div>
              <span className="text-gray-500">Black: </span>
              <span className={`font-medium ${playerColor === "b" ? "text-blue-700" : "text-gray-800"}`}>
                {game.blackUsername}
              </span>
              <span className="text-gray-400 ml-1">({game.blackRating ?? "?"})</span>
            </div>
            {game.opening && <div className="text-gray-600 italic truncate max-w-xs">{game.opening}</div>}
            {game.timeControl && <span className="text-gray-500">{game.timeControl}</span>}
            <span className={`font-semibold rounded px-2 py-0.5 text-xs border ${
              game.result === "win" ? "bg-green-50 text-green-700 border-green-200"
              : game.result === "loss" ? "bg-red-50 text-red-700 border-red-200"
              : "bg-gray-100 text-gray-600 border-gray-200"
            }`}>
              {game.result.toUpperCase()}
            </span>
          </div>
          {analyzeError && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {analyzeError}
            </div>
          )}
          {analyzeStatus && !analyzeError && (
            <div className="mt-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              {analyzeStatus}
            </div>
          )}
        </div>

        {/* Key Moments — shown above the board when analysis is available */}
        {hasAnalysis && (
          <KeyMomentsPanel
            keyMoves={keyMoves}
            playerColor={playerColor}
            onGoToPly={(plyIndex) => setCurrentPlyIndex(plyIndex)}
            currentPlyIndex={currentPlyIndex}
          />
        )}
        {!hasAnalysis && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-center text-sm text-gray-400">
            Analyze this game to see key moments and move evaluations.
          </div>
        )}

        {/* Board + move list */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
          {/* Left: board */}
          <div className="space-y-3">
            <BoardView
              fen={currentFen}
              currentPly={currentPly}
              orientation={playerColor === "w" ? "white" : "black"}
              onPrevMove={() => setCurrentPlyIndex((i) => Math.max(-1, i - 1))}
              onNextMove={() => setCurrentPlyIndex((i) => Math.min(plies.length - 1, i + 1))}
              onGoToStart={() => setCurrentPlyIndex(-1)}
              onGoToEnd={() => setCurrentPlyIndex(plies.length - 1)}
              canGoPrev={currentPlyIndex >= 0}
              canGoNext={currentPlyIndex < plies.length - 1}
            />
            <p className="text-xs text-center text-gray-400">← → arrow keys to navigate</p>
          </div>

          {/* Right: move list + analysis panel */}
          <div className="flex flex-col gap-4 min-h-0">
            {/* Move list */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Moves</h3>
                {hasAnalysis && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                      key moment
                    </span>
                  </div>
                )}
              </div>
              <div className="overflow-y-auto max-h-72 p-2">
                <MoveList
                  plies={plies}
                  moveAnalyses={game.moveAnalyses}
                  currentPlyIndex={currentPlyIndex}
                  onSelectPly={setCurrentPlyIndex}
                  playerColor={playerColor}
                />
              </div>
            </div>

            {/* Per-move analysis */}
            <AnalysisPanel
              ply={currentPly}
              analysis={currentAnalysis}
              playerColor={playerColor}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
