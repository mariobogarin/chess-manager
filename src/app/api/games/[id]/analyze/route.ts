import { NextRequest, NextResponse } from "next/server";
import { analyzeGame } from "@/lib/analysis/analyzer";
import { prisma } from "@/lib/db/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const game = await prisma.game.findUnique({ where: { id } });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const messages: string[] = [];
    await analyzeGame(id, {
      onProgress: (msg) => {
        console.log(`[analyze/${id}]`, msg);
        messages.push(msg);
      },
    });

    return NextResponse.json({ success: true, messages });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    const isStockfishError = error.toLowerCase().includes("stockfish");
    return NextResponse.json(
      {
        error,
        hint: isStockfishError
          ? "Stockfish is not installed or not found. Install it and set STOCKFISH_PATH in .env."
          : undefined,
      },
      { status: 500 }
    );
  }
}
