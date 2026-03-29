import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const profile = await prisma.playerProfile.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        patternSummary: {
          orderBy: { frequency: "desc" },
          take: 10,
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Aggregate stats
    const [totalGames, winCount, lossCount, drawCount, recentGames] =
      await Promise.all([
        prisma.game.count({ where: { playerProfileId: profile.id } }),
        prisma.game.count({ where: { playerProfileId: profile.id, result: "win" } }),
        prisma.game.count({ where: { playerProfileId: profile.id, result: "loss" } }),
        prisma.game.count({ where: { playerProfileId: profile.id, result: "draw" } }),
        prisma.game.findMany({
          where: { playerProfileId: profile.id },
          orderBy: { endTime: "desc" },
          take: 10,
          include: {
            analysisSummary: {
              select: { analyzedAt: true, resultCategory: true, majorFindings: true },
            },
          },
        }),
      ]);

    // Games as white / black
    const [whiteGames, blackGames] = await Promise.all([
      prisma.game.count({
        where: { playerProfileId: profile.id, whiteUsername: profile.username },
      }),
      prisma.game.count({
        where: { playerProfileId: profile.id, blackUsername: profile.username },
      }),
    ]);

    // Time control breakdown
    const allGames = await prisma.game.findMany({
      where: { playerProfileId: profile.id },
      select: { timeControl: true },
    });
    const timeControlMap: Record<string, number> = {};
    for (const g of allGames) {
      const tc = categorizeTimeControl(g.timeControl);
      timeControlMap[tc] = (timeControlMap[tc] ?? 0) + 1;
    }

    // Analyzed games count
    const analyzedCount = await prisma.gameAnalysisSummary.count({
      where: { game: { playerProfileId: profile.id } },
    });

    return NextResponse.json({
      profile,
      stats: {
        total: totalGames,
        wins: winCount,
        losses: lossCount,
        draws: drawCount,
        asWhite: whiteGames,
        asBlack: blackGames,
        analyzed: analyzedCount,
        timeControls: timeControlMap,
      },
      patterns: profile.patternSummary,
      recentGames,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error }, { status: 500 });
  }
}

function categorizeTimeControl(tc: string | null): string {
  if (!tc) return "Unknown";
  const seconds = parseTimeControlToSeconds(tc);
  if (seconds === null) return tc;
  if (seconds < 180) return "Bullet";
  if (seconds < 600) return "Blitz";
  if (seconds < 1800) return "Rapid";
  return "Classical";
}

function parseTimeControlToSeconds(tc: string): number | null {
  // Formats: "600", "600+5", "180+2"
  const match = tc.match(/^(\d+)(\+\d+)?$/);
  if (!match) return null;
  return parseInt(match[1]);
}
