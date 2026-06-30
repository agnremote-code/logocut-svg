import ResultClient from "./result-client";

type ResultPageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export default async function ResultPage({ params }: ResultPageProps) {
  const { jobId } = await params;

  return <ResultClient jobId={jobId} />;
}
