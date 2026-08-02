import { NextResponse } from "next/server";
import { deterministicProvider } from "@/lib/providers/local";
import { validateLessonDraft } from "@/lib/validation/lesson";
import type { LessonDraft, LessonScreen } from "@/types/lesson";

function applyRequestedChange(screen: LessonScreen, change: string): LessonScreen {
  if (!change) return { ...screen, instruction: `${screen.instruction} Probá con un ejemplo nuevo.` };
  const prompt = change.toLocaleLowerCase();
  if (/role\s*play|juego de rol/.test(prompt)) return { ...screen, type: "discussion", layout: "role-play-scenario", instruction: "Elegí un rol, una meta y una expresión que tenés que usar.", teacherNotes: [...screen.teacherNotes, `Teacher change: ${change.slice(0, 160)}`] };
  if (/more visual|más visual|mas visual/.test(prompt)) return { ...screen, layout: "photo-choice", instruction: "Elegí una escena visual y conectala con el objetivo de la pantalla." };
  if (/speaking|hablar|conversation/.test(prompt)) return { ...screen, type: "personal-questions", layout: "split-image-questions", instruction: "Respondé en voz alta y agregá un detalle personal." };
  if (/harder|más difícil|mas dificil/.test(prompt)) return { ...screen, prompts: screen.prompts.map((item) => `${item} Explicá por qué y agregá un contraejemplo.`), instruction: `${screen.instruction} Justificá cada decisión.` };
  if (/argentin|rioplatense/.test(prompt)) return { ...screen, instruction: screen.instruction.replace(/\btú\b/gi, "vos").replace(/\btu\b/gi, "tu"), teacherNotes: [...screen.teacherNotes, "Use natural Rioplatense forms and voseo."] };
  return { ...screen, instruction: `${screen.instruction} Cambio solicitado: ${change.slice(0, 140)}.` };
}

export async function POST(request: Request) {
  let body: { lesson?: LessonDraft; screenId?: string; change?: string };
  try {
    body = (await request.json()) as { lesson?: LessonDraft; screenId?: string; change?: string };
  } catch {
    return NextResponse.json({ error: "Malformed regeneration request." }, { status: 400 });
  }
  if (!body.lesson || !body.screenId) return NextResponse.json({ error: "Choose a lesson screen to regenerate." }, { status: 400 });
  const validated = validateLessonDraft(body.lesson);
  if (!validated.ok) return NextResponse.json({ error: "The lesson is no longer compatible with this demo." }, { status: 400 });
  if (!body.lesson.screens.some((screen) => screen.id === body.screenId)) {
    return NextResponse.json({ error: "Lesson screen not found." }, { status: 404 });
  }
  const refreshed = await deterministicProvider.regenerateScreen?.(body.lesson, body.screenId) ?? body.lesson;
  const change = typeof body.change === "string" ? body.change.trim() : "";
  const lesson = { ...refreshed, screens: refreshed.screens.map((screen) => screen.id === body.screenId ? applyRequestedChange(screen, change) : screen) };
  return NextResponse.json({ lesson });
}
