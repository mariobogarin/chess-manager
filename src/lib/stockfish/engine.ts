import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs";

// ── Configuration ──────────────────────────────────────────────────────────────
export interface StockfishConfig {
  depth: number;
  movetime: number; // ms
  multiPV: number;
}

export const DEFAULT_CONFIG: StockfishConfig = {
  depth: 16,
  movetime: 1000,
  multiPV: 1,
};

// ── Types ──────────────────────────────────────────────────────────────────────
export interface EngineEval {
  bestMove: string | null;       // e.g. "e2e4"
  ponder: string | null;
  score: number;                 // centipawns from current side's perspective
  isMate: boolean;               // true if score is a mate count
  bestLine: string[];            // principal variation (SAN-like UCI moves)
}

// ── Stockfish path resolution ──────────────────────────────────────────────────
function resolveStockfishPath(): string {
  // Allow override via env
  if (process.env.STOCKFISH_PATH) {
    return process.env.STOCKFISH_PATH;
  }

  // Check common install locations in order, return the first that exists
  const candidates = [
    "/opt/homebrew/bin/stockfish",  // macOS Homebrew (Apple Silicon + Intel)
    "/usr/local/bin/stockfish",     // macOS Homebrew (older) / Linux
    "/usr/bin/stockfish",           // Linux apt
    "/usr/games/stockfish",         // Linux apt (some distros)
    path.join(process.cwd(), "bin", "stockfish"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // Fall back to PATH lookup — will fail with a clear error at spawn time
  return "stockfish";
}

// ── Engine communication ───────────────────────────────────────────────────────
export async function evaluatePosition(
  fen: string,
  config: StockfishConfig = DEFAULT_CONFIG
): Promise<EngineEval> {
  return new Promise((resolve, reject) => {
    const stockfishPath = resolveStockfishPath();
    let proc: ChildProcessWithoutNullStreams;

    try {
      proc = spawn(stockfishPath, [], { stdio: ["pipe", "pipe", "pipe"] });
    } catch (err) {
      reject(new Error(`Failed to spawn Stockfish at "${stockfishPath}". Install Stockfish and set STOCKFISH_PATH. ${err}`));
      return;
    }

    let output = "";
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("Stockfish analysis timed out"));
    }, config.movetime * 3 + 5000);

    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      console.error("[Stockfish stderr]", data.toString());
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(new Error(`Stockfish process error: ${err.message}`));
    });

    proc.on("close", () => {
      clearTimeout(timeout);
      try {
        const result = parseStockfishOutput(output);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });

    // Send UCI commands
    const commands = [
      "uci",
      "isready",
      `setoption name MultiPV value ${config.multiPV}`,
      `position fen ${fen}`,
      `go depth ${config.depth} movetime ${config.movetime}`,
    ];

    proc.stdin.write(commands.join("\n") + "\n");

    // Wait for bestmove then quit
    proc.stdout.on("data", (data: Buffer) => {
      if (data.toString().includes("bestmove")) {
        proc.stdin.write("quit\n");
      }
    });
  });
}

function parseStockfishOutput(output: string): EngineEval {
  const lines = output.split("\n");

  let score = 0;
  let isMate = false;
  let bestMove: string | null = null;
  let ponder: string | null = null;
  let bestLine: string[] = [];

  for (const line of lines) {
    // Parse score from info lines
    if (line.startsWith("info") && line.includes("score")) {
      const mateMatch = line.match(/score mate (-?\d+)/);
      const cpMatch = line.match(/score cp (-?\d+)/);
      const pvMatch = line.match(/ pv (.+)/);

      if (mateMatch) {
        isMate = true;
        score = parseInt(mateMatch[1]);
      } else if (cpMatch) {
        isMate = false;
        score = parseInt(cpMatch[1]);
      }

      if (pvMatch) {
        bestLine = pvMatch[1].trim().split(" ");
      }
    }

    // Parse bestmove line
    if (line.startsWith("bestmove")) {
      const parts = line.trim().split(" ");
      bestMove = parts[1] !== "(none)" ? parts[1] : null;
      ponder = parts[3] ?? null;
    }
  }

  return { bestMove, ponder, score, isMate, bestLine };
}

// ── Batch analysis helper ──────────────────────────────────────────────────────
export interface PositionToAnalyze {
  plyIndex: number;
  fen: string;
}

export interface PositionResult {
  plyIndex: number;
  result: EngineEval;
  error?: string;
}

/** Analyze multiple positions sequentially (no concurrent Stockfish instances). */
export async function analyzePositions(
  positions: PositionToAnalyze[],
  config: StockfishConfig = DEFAULT_CONFIG,
  onProgress?: (done: number, total: number) => void
): Promise<PositionResult[]> {
  const results: PositionResult[] = [];

  for (let i = 0; i < positions.length; i++) {
    const { plyIndex, fen } = positions[i];
    try {
      const result = await evaluatePosition(fen, config);
      results.push({ plyIndex, result });
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      results.push({
        plyIndex,
        result: { bestMove: null, ponder: null, score: 0, isMate: false, bestLine: [] },
        error,
      });
    }
    onProgress?.(i + 1, positions.length);
  }

  return results;
}
