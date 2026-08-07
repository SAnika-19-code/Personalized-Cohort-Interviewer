import { NextRequest, NextResponse } from "next/server";
import { processAnswer } from "@/lib/interview/engine";
import type { NextInterviewRequest } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: NextInterviewRequest = await request.json();

    if (!body.session || !body.candidateAnswer?.trim()) {
      return NextResponse.json(
        { error: "Session and candidateAnswer are required." },
        { status: 400 }
      );
    }

    const { session, interviewerMessage, isComplete } = processAnswer(
      body.session,
      body.candidateAnswer.trim()
    );

    return NextResponse.json({
      interviewerMessage,
      updatedSession: session,
      isComplete,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process answer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
