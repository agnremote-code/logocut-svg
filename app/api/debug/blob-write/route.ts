import { NextResponse } from "next/server";
import { runBlobWriteDiagnostic } from "@/lib/server-job-store";

export async function POST() {
  return NextResponse.json(await runBlobWriteDiagnostic());
}
