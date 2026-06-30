import ProcessingClient from "./processing-client";

type ProcessingPageProps = {
  params: Promise<{
    jobId: string;
  }>;
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function ProcessingPage({
  params,
  searchParams,
}: ProcessingPageProps) {
  const { jobId } = await params;
  const { session_id: sessionId } = await searchParams;

  return <ProcessingClient jobId={jobId} sessionId={sessionId ?? ""} />;
}
