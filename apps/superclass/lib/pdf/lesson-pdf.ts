import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { LessonDraft, LessonScreen } from "@/types/lesson";

export type PdfMode = "student" | "teacher";

const PAGE = { width: 595.28, height: 841.89, margin: 52 };
const colors = {
  ink: rgb(0.09, 0.2, 0.3),
  accent: rgb(0.16, 0.49, 0.65),
  muted: rgb(0.4, 0.44, 0.52),
  line: rgb(0.85, 0.89, 0.93),
};

const safe = (value: string) =>
  value.replaceAll("||", " / ").replaceAll("—", "-").replaceAll("–", "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();

export function pdfFilename(lesson: LessonDraft, mode: PdfMode) {
  const slug = lesson.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `superclass-${slug}-${lesson.level.toLowerCase()}-${mode === "student" ? "student-workbook" : "teacher-pack"}.pdf`;
}

export function pdfScreensForMode(lesson: LessonDraft, mode: PdfMode) {
  return mode === "teacher"
    ? lesson.screens
    : lesson.screens
        .filter((screen) => screen.type !== "answer-key")
        .map((screen) => ({ ...screen, answers: [], teacherNotes: [] }));
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = safe(text).split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateLessonPdf(lesson: LessonDraft, mode: PdfMode) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;

  const addPage = (section = "") => {
    page = doc.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.margin;
    page.drawText("SUPERCLASS", { x: PAGE.margin, y, font: bold, size: 9, color: colors.accent });
    page.drawText(section.toUpperCase(), { x: PAGE.width - PAGE.margin - bold.widthOfTextAtSize(section.toUpperCase(), 8), y, font: bold, size: 8, color: colors.muted });
    y -= 34;
  };
  const ensure = (height: number, section: string) => {
    if (y - height < 58) addPage(section);
  };
  const paragraph = (text: string, options: { size?: number; color?: ReturnType<typeof rgb>; bold?: boolean; gap?: number; indent?: number } = {}) => {
    const size = options.size ?? 10.5;
    const font = options.bold ? bold : regular;
    const indent = options.indent ?? 0;
    const lines = wrap(text, font, size, PAGE.width - PAGE.margin * 2 - indent);
    const height = lines.length * (size * 1.35) + (options.gap ?? 8);
    ensure(height, mode === "student" ? "Student workbook" : "Teacher pack");
    for (const line of lines) {
      page.drawText(line, { x: PAGE.margin + indent, y, font, size, color: options.color ?? colors.ink });
      y -= size * 1.35;
    }
    y -= options.gap ?? 8;
  };
  const heading = (text: string) => {
    ensure(46, text);
    paragraph(text, { size: 18, bold: true, gap: 13 });
    page.drawLine({ start: { x: PAGE.margin, y: y + 5 }, end: { x: PAGE.width - PAGE.margin, y: y + 5 }, thickness: 1, color: colors.line });
  };
  const activity = (screen: LessonScreen, index: number) => {
    const estimated = 80 + screen.prompts.length * 24 + screen.vocabulary.length * 32;
    ensure(Math.min(estimated, 260), screen.title);
    paragraph(`${String(index + 1).padStart(2, "0")}  ${screen.type.replaceAll("-", " ").toUpperCase()}  |  ${screen.timing} MIN`, { size: 8, bold: true, color: colors.accent, gap: 6 });
    paragraph(screen.title, { size: 15, bold: true, gap: 7 });
    paragraph(screen.instruction, { size: 10.5, gap: 7 });
    if (screen.sourceExcerpt) paragraph(`Source: ${screen.sourceExcerpt}`, { size: 9.5, color: colors.muted, gap: 8 });
    for (const item of screen.vocabulary) {
      paragraph(`${item.term} - ${item.meaning}\nExample: ${item.example}`, { size: 9.5, indent: 12, gap: 5 });
    }
    screen.prompts.forEach((prompt, promptIndex) => {
      paragraph(`${promptIndex + 1}. ${prompt}`, { size: 10, gap: 4 });
      if (mode === "student") {
        ensure(35, screen.title);
        page.drawLine({ start: { x: PAGE.margin + 12, y: y - 8 }, end: { x: PAGE.width - PAGE.margin, y: y - 8 }, thickness: 0.6, color: colors.line });
        y -= 27;
      }
    });
    if (mode === "teacher") {
      screen.answers.forEach((answer) => paragraph(`Answer or model: ${answer}`, { size: 9, color: colors.accent, indent: 12, gap: 4 }));
      screen.teacherNotes.forEach((note) => paragraph(`Teacher note: ${note}`, { size: 9, color: colors.muted, indent: 12, gap: 4 }));
    }
    y -= 8;
  };

  page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: rgb(0.97, 0.98, 0.99) });
  page.drawRectangle({ x: PAGE.margin, y: PAGE.height - 155, width: 98, height: 8, color: colors.accent });
  page.drawText("SUPERCLASS", { x: PAGE.margin, y: PAGE.height - 110, font: bold, size: 13, color: colors.accent });
  const titleLines = wrap(lesson.title, bold, 34, PAGE.width - PAGE.margin * 2);
  let coverY = PAGE.height - 205;
  titleLines.forEach((line) => { page.drawText(line, { x: PAGE.margin, y: coverY, font: bold, size: 34, color: colors.ink }); coverY -= 43; });
  page.drawText(mode === "student" ? "STUDENT WORKBOOK" : "TUTOR & TEACHER PACK", { x: PAGE.margin, y: coverY - 22, font: bold, size: 15, color: colors.accent });
  page.drawText(`${lesson.language} | ${lesson.dialect} | ${lesson.level} | ${lesson.duration} minutes`, { x: PAGE.margin, y: coverY - 58, font: regular, size: 12, color: colors.muted });
  page.drawText((lesson.archetype ?? "classroom lesson").replaceAll("-", " ").toUpperCase(), { x: PAGE.margin, y: coverY - 84, font: bold, size: 9, color: colors.accent });
  page.drawText("Describe the class. Open it. Teach it.", { x: PAGE.margin, y: 72, font: regular, size: 10, color: colors.muted });

  addPage(mode === "student" ? "Workbook overview" : "Lesson overview");
  heading("Lesson objectives");
  lesson.objectives.forEach((objective) => paragraph(`• ${objective}`, { size: 10.5, gap: 5 }));
  if (mode === "teacher") {
    heading("Full lesson timeline");
    lesson.screens.forEach((screen, index) => paragraph(`${String(index + 1).padStart(2, "0")}  ${screen.title} - ${screen.timing} min`, { size: 9.5, gap: 3 }));
  }

  addPage(mode === "student" ? "Activities" : "Teaching sequence");
  pdfScreensForMode(lesson, mode).forEach(activity);

  if (mode === "teacher") {
    addPage("Next steps");
    heading("Suggested next lesson");
    paragraph(lesson.suggestedNextLesson);
    heading("Answer key");
    lesson.screens.flatMap((screen) => screen.answers.map((answer) => `${screen.title}: ${answer}`)).forEach((answer) => paragraph(`• ${answer}`, { size: 9.5, gap: 4 }));
  }

  const pages = doc.getPages();
  pages.forEach((item, index) => {
    item.drawText(`${index + 1} / ${pages.length}`, { x: PAGE.width - PAGE.margin - 30, y: 28, font: regular, size: 8, color: colors.muted });
  });
  doc.setTitle(`${lesson.title} - ${mode === "student" ? "Student Workbook" : "Teacher Pack"}`);
  doc.setAuthor("Superclass");
  return doc.save();
}
