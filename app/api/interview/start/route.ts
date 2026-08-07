import { NextRequest, NextResponse } from "next/server";
import { startInterview } from "@/lib/interview/engine";
import type { StartInterviewRequest } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: StartInterviewRequest = await request.json();

    if (!body.candidateProfile || !body.curriculum) {
      return NextResponse.json(
        { error: "Both candidateProfile and curriculum are required." },
        { status: 400 }
      );
    }

    const { session, firstQuestion } = startInterview(
      body.candidateProfile,
      body.curriculum
    );

    return NextResponse.json({ session, firstQuestion });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start interview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
