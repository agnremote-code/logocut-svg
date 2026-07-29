import { NextResponse } from "next/server";
import { deterministicProvider } from "@/lib/providers/local";
import { validateLessonDraft } from "@/lib/validation/lesson";
import type { LessonDraft } from "@/types/lesson";

export async function POST(request: Request) {
  let body: { lesson?: LessonDraft; screenId?: string };
  try {
    body = (await request.json()) as { lesson?: LessonDraft; screenId?: string };
  } catch {
    return NextResponse.json({ error: "Malformed regeneration request." }, { status: 400 });
  }
  if (!body.lesson || !body.screenId) return NextResponse.json({ error: "Choose a lesson screen to regenerate." }, { status: 400 });
  const validated = validateLessonDraft(body.lesson);
  if (!validated.ok) return NextResponse.json({ error: "The lesson is no longer compatible with this demo." }, { status: 400 });
  if (!body.lesson.screens.some((screen) => screen.id === body.screenId)) {
    return NextResponse.json({ error: "Lesson screen not found." }, { status: 404 });
  }
  const lesson = await deterministicProvider.regenerateScreen?.(body.lesson, body.screenId);
  return NextResponse.json({ lesson });
}
