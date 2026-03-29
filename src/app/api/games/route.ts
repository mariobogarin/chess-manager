import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const skip = (page - 1) * limit;

    if (!username) {
      return NextResponse.json({ error: "username query param required" }, { status: 400 });
    }

    const profile = await prisma.playerProfile.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!profile) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where: { playerProfileId: profile.id },
        orderBy: { endTime: "desc" },
        skip,
        take: limit,
        include: {
          analysisSummary: {
            select: { analyzedAt: true, resultCategory: true, majorFindings: true },
          },
        },
      }),
      prisma.game.count({ where: { playerProfileId: profile.id } }),
    ]);

    return NextResponse.json({
      games,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error }, { status: 500 });
  }
}
