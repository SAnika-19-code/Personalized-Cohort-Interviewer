import { NextRequest, NextResponse } from "next/server";
import { endInterview } from "@/lib/interview/engine";
import type { EndInterviewRequest } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: EndInterviewRequest = await request.json();

    if (!body.session) {
      return NextResponse.json(
        { error: "Session is required." },
        { status: 400 }
      );
    }

    const report = endInterview(body.session);

    return NextResponse.json({ report });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to end interview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
