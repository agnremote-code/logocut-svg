import { notFound } from "next/navigation";
import Link from "next/link";
import { getProviderConfig } from "@/lib/providers/config";
import { getGenerationDiagnostics } from "@/lib/providers/telemetry";

export const dynamic = "force-dynamic";

export default function ProviderDiagnosticsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const config = getProviderConfig();
  const diagnostics = getGenerationDiagnostics();

  return (
    <main className="diagnostics-page">
      <header>
        <Link href="/">← Superclass</Link>
        <span>Development only</span>
        <h1>Provider diagnostics</h1>
        <p>Operational metadata only. API keys, lesson text, transcripts, interests, goals, and student details are never shown.</p>
      </header>

      <section className="diagnostic-summary" aria-label="Provider configuration">
        <article>
          <small>Provider selected</small>
          <strong>{config.provider}</strong>
        </article>
        <article>
          <small>Model</small>
          <strong>{config.provider === "openai" ? config.openAiModel : "deterministic-local"}</strong>
        </article>
        <article>
          <small>Timeout</small>
          <strong>{(config.timeoutMs / 1_000).toFixed(0)} sec</strong>
        </article>
        <article>
          <small>Cache</small>
          <strong>{config.cache}</strong>
        </article>
      </section>

      <section className="diagnostic-table">
        <div className="diagnostic-heading">
          <div>
            <span>Recent requests</span>
            <h2>Safe generation telemetry</h2>
          </div>
          <Link href="/diagnostics">Refresh</Link>
        </div>
        {diagnostics.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Provider</th>
                  <th>Duration</th>
                  <th>Est. tokens</th>
                  <th>Validation</th>
                  <th>Attempts</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {diagnostics.map((item) => (
                  <tr key={`${item.requestId}-${item.createdAt}`}>
                    <td><code>{item.requestId}</code></td>
                    <td>{item.provider}<small>{item.model}</small></td>
                    <td>{item.durationMs} ms</td>
                    <td>{(item.estimatedInputTokens + item.estimatedOutputTokens).toLocaleString()}</td>
                    <td><span className={`status status-${item.validation}`}>{item.validation}</span></td>
                    <td>{item.attemptCount}</td>
                    <td>{item.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="diagnostic-empty">
            <strong>No generation requests yet.</strong>
            <p>Generate a lesson locally, then refresh this page.</p>
          </div>
        )}
      </section>
    </main>
  );
}
