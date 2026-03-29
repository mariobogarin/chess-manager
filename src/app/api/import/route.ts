import { NextRequest, NextResponse } from "next/server";
import { importGamesForUser } from "@/lib/chesscom/importer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = body.username?.trim();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const result = await importGamesForUser(username);

    return NextResponse.json({
      success: true,
      username,
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
      errors: result.errors.slice(0, 5), // Cap error list for response
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const status = error.message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
