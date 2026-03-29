import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { analyzeGame } from "@/lib/analysis/analyzer";

// Stream newline-delimited JSON progress events back to the client
export async function POST(req: NextRequest) {
  const body = await req.json();
  const username = body.username?.trim();

  if (!username) {
    return new Response(JSON.stringify({ error: "username required" }), { status: 400 });
  }

  const profile = await prisma.playerProfile.findUnique({
    where: { username: username.toLowerCase() },
  });

  if (!profile) {
    return new Response(JSON.stringify({ error: "Player not found" }), { status: 404 });
  }

  // Fetch all games (optionally skip already-analyzed ones)
  const onlyUnanalyzed = body.onlyUnanalyzed !== false; // default true
  const games = await prisma.game.findMany({
    where: {
      playerProfileId: profile.id,
      ...(onlyUnanalyzed
        ? { analysisSummary: null }
        : {}),
    },
    select: { id: true, whiteUsername: true, blackUsername: true },
    orderBy: { endTime: "desc" },
  });

  const total = games.length;

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + "\n"));
      }

      if (total === 0) {
        send({ type: "done", message: "No games to analyze.", total: 0, done: 0, failed: 0 });
        controller.close();
        return;
      }

      send({ type: "start", total });

      let done = 0;
      let failed = 0;

      for (const game of games) {
        const label = `${game.whiteUsername} vs ${game.blackUsername}`;
        send({ type: "progress", gameId: game.id, label, done, total });

        try {
          await analyzeGame(game.id);
          done++;
          send({ type: "progress", gameId: game.id, label, done, total, success: true });
        } catch (err: unknown) {
          failed++;
          const error = err instanceof Error ? err.message : String(err);
          send({ type: "progress", gameId: game.id, label, done, total, success: false, error });
          // If Stockfish is unavailable, abort early — no point continuing
          if (error.toLowerCase().includes("stockfish")) {
            send({
              type: "error",
              message: `Stockfish not available: ${error}`,
              hint: "Install Stockfish and set STOCKFISH_PATH in .env",
            });
            controller.close();
            return;
          }
        }
      }

      send({ type: "done", total, done, failed });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
