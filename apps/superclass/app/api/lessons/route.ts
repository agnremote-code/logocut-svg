import { NextResponse } from "next/server";
import { buildLessonDraft, type LessonRequest } from "@/lib/lesson";

const allowedLevels = new Set(["A0", "A1", "A2", "B1", "B2", "C1", "C2"]);
const allowedDurations = new Set([30, 45, 60, 90]);
const allowedLessonStyles = new Set(["conversation", "balanced", "grammar"]);
const allowedVisualStyles = new Set(["retro", "clean", "editorial"]);

export async function POST(request: Request) {
  let body: Partial<LessonRequest>;

  try {
    body = (await request.json()) as Partial<LessonRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.source?.trim() || body.source.trim().length < 6) {
    return NextResponse.json({ error: "Add a lesson idea, text, or transcript." }, { status: 400 });
  }

  if (!body.language?.trim()) {
    return NextResponse.json({ error: "Choose the language being taught." }, { status: 400 });
  }

  if (!allowedLevels.has(String(body.level))) {
    return NextResponse.json({ error: "Invalid lesson level." }, { status: 400 });
  }

  if (!allowedDurations.has(Number(body.duration))) {
    return NextResponse.json({ error: "Invalid lesson duration." }, { status: 400 });
  }

  if (!allowedLessonStyles.has(String(body.lessonStyle))) {
    return NextResponse.json({ error: "Invalid lesson style." }, { status: 400 });
  }

  if (!allowedVisualStyles.has(String(body.visualStyle))) {
    return NextResponse.json({ error: "Invalid visual style." }, { status: 400 });
  }

  if (body.studentType !== "individual" && body.studentType !== "group") {
    return NextResponse.json({ error: "Invalid student type." }, { status: 400 });
  }

  const lesson = buildLessonDraft(body as LessonRequest);
  return NextResponse.json({ lesson });
}
