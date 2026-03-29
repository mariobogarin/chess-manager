"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import type { Game, GameAnalysisSummary } from "@prisma/client";
import { Suspense } from "react";

interface GameWithSummary extends Game {
  analysisSummary: Pick<GameAnalysisSummary, "analyzedAt" | "resultCategory" | "majorFindings"> | null;
}

interface GamesResponse {
  games: GameWithSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function GamesListInner() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username") ?? "";
  const [data, setData] = useState<GamesResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<string>("all");

  async function fetchGames(p: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games?username=${username}&page=${p}&limit=20`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to load games");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (username) fetchGames(page);
  }, [username, page]);

  const filteredGames =
    data?.games.filter((g) =>
      resultFilter === "all" ? true : g.result === resultFilter
    ) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" label="Loading games..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">{error}</div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {["all", "win", "loss", "draw"].map((f) => (
          <button
            key={f}
            onClick={() => setResultFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              resultFilter === f
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-2">
          {data?.pagination.total ?? 0} total
        </span>
      </div>

      {/* Game list */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No games found.</div>
      ) : (
        <div className="space-y-2">
          {filteredGames.map((game) => (
            <GameCard key={game.id} game={game} playerUsername={username} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <button
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-2xl">♟</Link>
          <h1 className="text-lg font-bold text-gray-900">Game Library</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}>
          <GamesListInner />
        </Suspense>
      </main>
    </div>
  );
}
