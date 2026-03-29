"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import type { Game, GameAnalysisSummary, PatternSummary } from "@prisma/client";

interface GameWithSummary extends Game {
  analysisSummary: Pick<GameAnalysisSummary, "analyzedAt" | "resultCategory" | "majorFindings"> | null;
}

interface DashboardData {
  profile: { id: string; username: string; source: string };
  stats: {
    total: number;
    wins: number;
    losses: number;
    draws: number;
    asWhite: number;
    asBlack: number;
    analyzed: number;
    timeControls: Record<string, number>;
  };
  patterns: PatternSummary[];
  recentGames: GameWithSummary[];
}

interface BulkProgress {
  done: number;
  total: number;
  failed: number;
  currentLabel: string | null;
  error: string | null;
  hint: string | null;
  finished: boolean;
}

export default function DashboardPage() {
  const params = useParams();
  const username = params.username as string;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const [bulk, setBulk] = useState<BulkProgress | null>(null);

  async function fetchDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/${username}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to load dashboard");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshImport() {
    setImporting(true);
    setImportStatus("Importing new games...");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const d = await res.json();
      if (!res.ok) {
        setImportStatus(`Error: ${d.error}`);
      } else {
        setImportStatus(`Done: ${d.imported} new, ${d.skipped} already imported.`);
        await fetchDashboard();
      }
    } catch {
      setImportStatus("Network error");
    } finally {
      setImporting(false);
    }
  }

  async function handleAnalyzeAll() {
    setBulk({ done: 0, total: 0, failed: 0, currentLabel: null, error: null, hint: null, finished: false });

    try {
      const res = await fetch("/api/analyze-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, onlyUnanalyzed: true }),
      });

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({ error: "Unknown error" }));
        setBulk((p) => p && { ...p, error: d.error, finished: true });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "start") {
              setBulk({ done: 0, total: event.total, failed: 0, currentLabel: null, error: null, hint: null, finished: false });
            } else if (event.type === "progress") {
              setBulk((p) => p && {
                ...p,
                done: event.done,
                total: event.total,
                failed: p.failed + (event.success === false ? 1 : 0),
                currentLabel: event.label,
              });
            } else if (event.type === "error") {
              setBulk((p) => p && { ...p, error: event.message, hint: event.hint ?? null, finished: true });
            } else if (event.type === "done") {
              setBulk((p) => p && { ...p, done: event.done, failed: event.failed, finished: true, currentLabel: null });
              await fetchDashboard();
            }
          } catch {
            // malformed line — ignore
          }
        }
      }
    } catch {
      setBulk((p) => p && { ...p, error: "Network error during bulk analysis.", finished: true });
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">{error}</div>
          <Link href="/" className="text-blue-600 hover:underline text-sm">← Back to home</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, patterns, recentGames, profile } = data;
  const winRate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
  const unanalyzed = stats.total - stats.analyzed;
  const isBulkRunning = bulk !== null && !bulk.finished;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl">♟</Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{profile.username}</h1>
              <p className="text-xs text-gray-500">Chess Improvement Coach</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshImport}
              disabled={importing || isBulkRunning}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              {importing ? <LoadingSpinner size="sm" /> : null}
              Refresh import
            </button>
            <button
              onClick={handleAnalyzeAll}
              disabled={isBulkRunning || unanalyzed === 0}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isBulkRunning ? <LoadingSpinner size="sm" /> : null}
              {isBulkRunning
                ? `Analyzing ${bulk.done}/${bulk.total}…`
                : unanalyzed > 0
                ? `Analyze ${unanalyzed} game${unanalyzed !== 1 ? "s" : ""}`
                : "All analyzed"}
            </button>
            <Link
              href={`/games?username=${username}`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              All games
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Bulk analysis progress */}
        {bulk !== null && (
          <BulkProgressPanel bulk={bulk} onDismiss={() => setBulk(null)} />
        )}

        {importStatus && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
            {importStatus}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total games" value={stats.total.toString()} />
          <StatCard label="Win rate" value={`${winRate}%`} sub={`${stats.wins}W ${stats.losses}L ${stats.draws}D`} />
          <StatCard label="Analyzed" value={stats.analyzed.toString()} sub={`of ${stats.total} games`} />
          <StatCard label="As White / Black" value={`${stats.asWhite} / ${stats.asBlack}`} />
        </div>

        {/* Time controls */}
        {Object.keys(stats.timeControls).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Games by time control</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.timeControls).map(([tc, count]) => (
                <div key={tc} className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  <span className="text-sm font-medium text-gray-800">{tc}</span>
                  <span className="text-xs text-gray-500">{count} games</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Patterns */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Areas to improve</h2>
              {patterns.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Analyze some games to see recurring patterns.
                </p>
              ) : (
                <ul className="space-y-3">
                  {patterns.slice(0, 6).map((p) => (
                    <li key={p.key} className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{p.label}</div>
                        <div className="text-xs text-gray-500">{p.description}</div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5">
                        {p.frequency}×
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent games */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Recent games</h2>
              <Link href={`/games?username=${username}`} className="text-xs text-blue-600 hover:underline">
                View all →
              </Link>
            </div>
            {recentGames.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
                No games imported yet.
              </div>
            ) : (
              <div className="space-y-2">
                {recentGames.map((game) => (
                  <GameCard key={game.id} game={game} playerUsername={username} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function BulkProgressPanel({ bulk, onDismiss }: { bulk: BulkProgress; onDismiss: () => void }) {
  const pct = bulk.total > 0 ? Math.round((bulk.done / bulk.total) * 100) : 0;
  const isRunning = !bulk.finished;

  if (bulk.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-red-700 mb-1">Analysis failed</div>
            <div className="text-sm text-red-600">{bulk.error}</div>
            {bulk.hint && <div className="text-xs text-red-500 mt-1">{bulk.hint}</div>}
          </div>
          <button onClick={onDismiss} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      </div>
    );
  }

  if (bulk.finished) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-green-700">
            <span className="font-semibold">Analysis complete.</span>{" "}
            {bulk.done} game{bulk.done !== 1 ? "s" : ""} analyzed
            {bulk.failed > 0 && <span className="text-orange-600">, {bulk.failed} failed</span>}.
          </div>
          <button onClick={onDismiss} className="text-green-500 hover:text-green-700 text-lg leading-none">×</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-blue-800">
          Analyzing games with Stockfish…
        </div>
        <span className="text-sm font-mono text-blue-700">{bulk.done}/{bulk.total}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {bulk.currentLabel && (
        <div className="text-xs text-blue-600 truncate">
          Current: {bulk.currentLabel}
        </div>
      )}

      {bulk.failed > 0 && (
        <div className="text-xs text-orange-600">{bulk.failed} failed so far</div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
