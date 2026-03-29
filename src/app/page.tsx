"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    setStatus("Starting import...");

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Import failed");
        setStatus(null);
        return;
      }

      setStatus(
        `Import complete: ${data.imported} games imported, ${data.skipped} already in library.`
      );

      setTimeout(() => {
        router.push(`/dashboard/${username.trim().toLowerCase()}`);
      }, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white text-3xl mb-4 shadow-lg">
            ♟
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Chess Improvement Coach</h1>
          <p className="text-gray-500 mt-2">
            Analyze your Chess.com games and discover your recurring patterns.
          </p>
        </div>

        {/* Import card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Get started</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your Chess.com username to import and analyze your games.
          </p>

          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Chess.com username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. hikaru"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  Importing games...
                </span>
              ) : (
                "Import games"
              )}
            </button>
          </form>

          {status && !error && (
            <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {status}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Feature grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          {[
            ["Real game import", "From Chess.com public API"],
            ["Move-by-move board", "Navigate your games visually"],
            ["Stockfish analysis", "Engine evaluation per move"],
            ["Pattern detection", "Find recurring mistakes"],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-xl bg-white border border-gray-200 p-3">
              <div className="font-medium text-gray-800">{title}</div>
              <div className="text-gray-500 text-xs mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
