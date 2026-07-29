import { NextResponse } from "next/server";
import { generateLesson } from "@/lib/providers/generate";
import { ProviderError } from "@/lib/providers/types";
import { validateLessonRequest } from "@/lib/validation/lesson";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request. Send valid JSON." }, { status: 400 });
  }

  const parsed = validateLessonRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.errors[0], errors: parsed.errors }, { status: 400 });

  try {
    const lesson = await generateLesson(parsed.value);
    return NextResponse.json({ lesson, requestId: lesson.requestId });
  } catch (error) {
    const status = error instanceof ProviderError && error.code === "timeout" ? 504 : 502;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Lesson generation failed.",
        requestId: crypto.randomUUID(),
      },
      { status },
    );
  }
}
