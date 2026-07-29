import { NextResponse } from "next/server";
import { generateLessonPdf, pdfFilename, type PdfMode } from "@/lib/pdf/lesson-pdf";
import { validateLessonDraft } from "@/lib/validation/lesson";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode");
  if (mode !== "student" && mode !== "teacher") return NextResponse.json({ error: "Choose a student or teacher PDF." }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed PDF request." }, { status: 400 });
  }
  const validated = validateLessonDraft(body);
  if (!validated.ok) return NextResponse.json({ error: "This lesson cannot be exported.", details: validated.errors }, { status: 400 });
  try {
    const pdf = await generateLessonPdf(validated.value, mode as PdfMode);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilename(validated.value, mode as PdfMode)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "The PDF could not be generated." }, { status: 500 });
  }
}
