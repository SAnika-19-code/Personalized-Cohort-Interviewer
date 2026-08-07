import { NextRequest, NextResponse } from "next/server";
import { generateHint } from "@/lib/interview/engine";
import type { HintRequest } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: HintRequest = await request.json();

    if (!body.session) {
      return NextResponse.json(
        { error: "Session is required." },
        { status: 400 }
      );
    }

    const { session, hint } = generateHint(body.session);

    return NextResponse.json({ hint, updatedSession: session });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate hint";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
