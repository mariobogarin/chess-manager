import { prisma } from "@/lib/db/client";
import type {
  ChessComArchiveList,
  ChessComGameArchive,
  ChessComGame,
} from "./types";

const BASE_URL = "https://api.chess.com/pub/player";
const FETCH_DELAY_MS = 300; // polite delay between requests

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "ChessImprovementCoach/1.0" },
        next: { revalidate: 0 },
      });
      if (res.status === 429) {
        // Rate limited — wait longer and retry
        await sleep(2000 * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await sleep(1000 * (attempt + 1));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

export async function fetchArchiveList(username: string): Promise<string[]> {
  const url = `${BASE_URL}/${username.toLowerCase()}/games/archives`;
  const res = await fetchWithRetry(url);

  if (res.status === 404) {
    throw new Error(`Chess.com user "${username}" not found`);
  }
  if (!res.ok) {
    throw new Error(`Chess.com API error: ${res.status} ${res.statusText}`);
  }

  const data: ChessComArchiveList = await res.json();
  return data.archives ?? [];
}

export async function fetchGamesFromArchive(
  archiveUrl: string
): Promise<ChessComGame[]> {
  const res = await fetchWithRetry(archiveUrl);

  if (!res.ok) {
    // Some archives might be empty or temporarily unavailable
    console.warn(`Failed to fetch archive ${archiveUrl}: ${res.status}`);
    return [];
  }

  const data: ChessComGameArchive = await res.json();
  return data.games ?? [];
}

function deriveResult(game: ChessComGame, username: string): string {
  const lc = username.toLowerCase();
  const isWhite = game.white.username.toLowerCase() === lc;
  const playerResult = isWhite ? game.white.result : game.black.result;

  if (playerResult === "win") return "win";
  if (["checkmated", "timeout", "resigned", "lose", "abandoned"].includes(playerResult))
    return "loss";
  return "draw";
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export async function importGamesForUser(
  username: string,
  onProgress?: (msg: string) => void
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, failed: 0, errors: [] };

  // Upsert the player profile
  const profile = await prisma.playerProfile.upsert({
    where: { username: username.toLowerCase() },
    update: { updatedAt: new Date() },
    create: { username: username.toLowerCase(), source: "chess_com" },
  });

  onProgress?.("Fetching game archives list...");
  const archives = await fetchArchiveList(username);

  if (archives.length === 0) {
    throw new Error(`No public games found for user "${username}"`);
  }

  onProgress?.(`Found ${archives.length} monthly archives. Importing games...`);

  // Process archives from most recent first (reverse order)
  const sortedArchives = [...archives].reverse();

  for (let i = 0; i < sortedArchives.length; i++) {
    const archiveUrl = sortedArchives[i];
    onProgress?.(`Fetching archive ${i + 1}/${sortedArchives.length}...`);

    let games: ChessComGame[] = [];
    try {
      games = await fetchGamesFromArchive(archiveUrl);
    } catch (err) {
      const msg = `Failed to fetch archive ${archiveUrl}: ${err}`;
      console.error(msg);
      result.errors.push(msg);
      result.failed++;
    }

    for (const game of games) {
      if (!game.pgn || game.rules !== "chess") {
        result.skipped++;
        continue;
      }

      try {
        await prisma.game.upsert({
          where: { externalGameId: game.uuid },
          update: {}, // If already exists, skip (safe re-import)
          create: {
            externalGameId: game.uuid,
            playerProfileId: profile.id,
            url: game.url,
            pgn: game.pgn,
            timeControl: game.time_control,
            endTime: new Date(game.end_time * 1000),
            rated: game.rated,
            rules: game.rules,
            whiteUsername: game.white.username,
            blackUsername: game.black.username,
            whiteRating: game.white.rating,
            blackRating: game.black.rating,
            result: deriveResult(game, username),
            eco: game.eco,
            opening: game.opening,
            initialFen: game.initial_setup,
            importedAt: new Date(),
          },
        });
        result.imported++;
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        // Unique constraint violation means already imported
        if (error.code === "P2002") {
          result.skipped++;
        } else {
          const msg = `Failed to store game ${game.uuid}: ${error.message}`;
          console.error(msg);
          result.errors.push(msg);
          result.failed++;
        }
      }
    }

    // Polite delay between archive fetches
    if (i < sortedArchives.length - 1) {
      await sleep(FETCH_DELAY_MS);
    }
  }

  return result;
}
