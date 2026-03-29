import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { parsePgn, type Ply } from "@/lib/pgn/parser";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        analysisSummary: true,
        moveAnalyses: {
          orderBy: { plyIndex: "asc" },
        },
        playerProfile: {
          select: { username: true },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Parse PGN to get plies for board navigation
    let plies: Ply[] = [];
    try {
      const parsed = parsePgn(game.pgn);
      plies = parsed.plies;
    } catch (err) {
      console.error("PGN parse error:", err);
    }

    return NextResponse.json({ game, plies });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error }, { status: 500 });
  }
}
