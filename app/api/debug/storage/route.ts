import { NextResponse } from "next/server";
import { getBlobStorageDiagnostics } from "@/lib/server-job-store";

export async function GET() {
  return NextResponse.json(getBlobStorageDiagnostics());
}
