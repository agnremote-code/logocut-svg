import { ImageQualityInspection, QualityRating } from "@/lib/image-quality";

type QualityCheckCardProps = {
  inspection?: ImageQualityInspection;
  isLoading?: boolean;
  error?: string;
  compact?: boolean;
  showDebugDetails?: boolean;
};

const ratingStyles: Record<
  QualityRating,
  {
    icon: string;
    border: string;
    background: string;
    text: string;
  }
> = {
  excellent: {
    icon: "🟢",
    border: "border-[#b8d8bf]",
    background: "bg-[#f1f8f2]",
    text: "text-[#315f46]",
  },
  good: {
    icon: "🟡",
    border: "border-[#e4d58c]",
    background: "bg-[#fff9dc]",
    text: "text-[#6a5414]",
  },
  risky: {
    icon: "🟠",
    border: "border-[#e6bf91]",
    background: "bg-[#fff4e8]",
    text: "text-[#8a4b18]",
  },
  poor: {
    icon: "🔴",
    border: "border-[#e4b5a8]",
    background: "bg-[#fff4f0]",
    text: "text-[#8a3426]",
  },
};

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function QualityCheckCard({
  inspection,
  isLoading = false,
  error = "",
  compact = false,
  showDebugDetails = false,
}: QualityCheckCardProps) {
  if (isLoading) {
    return (
      <section className="rounded-[8px] border border-[#e0dbd1] bg-[#fbfaf7] p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#657167]">
          Quality Check
        </p>
        <p className="mt-2 text-sm font-medium text-[#626a61]">
          Checking logo before checkout...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[8px] border border-[#e4b5a8] bg-[#fff4f0] p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a3426]">
          Quality Check
        </p>
        <p className="mt-2 text-sm font-medium text-[#8a3426]">{error}</p>
      </section>
    );
  }

  if (!inspection) {
    return null;
  }

  const styles = ratingStyles[inspection.rating];

  return (
    <section
      className={`rounded-[8px] border p-4 ${styles.border} ${styles.background}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#657167]">
            Quality Check
          </p>
          <h3 className={`mt-2 text-lg font-semibold ${styles.text}`}>
            <span aria-hidden="true">{styles.icon}</span> {inspection.headline}
          </h3>
          <p className="mt-1 text-sm font-medium text-[#27342b]">
            {inspection.summary}
          </p>
        </div>

        {showDebugDetails ? (
          <div className="rounded-[8px] border border-white bg-white/80 px-4 py-3 text-left shadow-sm sm:min-w-44">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#657167]">
              SVG Confidence
            </p>
            <p className={`text-3xl font-semibold leading-none ${styles.text}`}>
              {inspection.cricutSuccessScore}%
            </p>
            <p className="mt-1 text-sm font-semibold text-[#172017]">
              {inspection.cricutSuccessLabel}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#626a61]">
              {inspection.cricutSuccessExplanation}
            </p>
          </div>
        ) : null}
      </div>

      {showDebugDetails ? (
        <p className="mt-4 rounded-[8px] border border-white bg-white/75 px-3 py-2 text-sm leading-6 text-[#27342b]">
          Internal estimate of SVG conversion confidence.
        </p>
      ) : null}

      {inspection.warningBadges.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {inspection.warningBadges.map((warning) => (
            <span
              key={warning}
              className="rounded-[8px] border border-[#e6bf91] bg-white/85 px-2.5 py-1 text-xs font-semibold text-[#8a4b18]"
            >
              {warning}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-[8px] border border-[#c9dfcf] bg-white/80 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#657167]">
          Recommended cut mode
        </p>
        <p className="mt-1 text-sm font-semibold text-[#315f46]">
          {inspection.recommendedCutType === "single"
            ? "Single-color cut"
            : "Multi-color layered cut"}
        </p>
        <p className="mt-1 text-sm leading-6 text-[#626a61]">
          {inspection.recommendationReason}
        </p>
      </div>

      {showDebugDetails && inspection.sourceRecommendation ? (
        <div className="mt-4 rounded-[8px] border border-[#e6bf91] bg-white/85 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a4b18]">
            Better source recommended
          </p>
          <p className="mt-2 text-sm leading-6 text-[#27342b]">
            {inspection.sourceRecommendation}
          </p>
        </div>
      ) : null}

      {showDebugDetails ? (
        <div
          className={`mt-4 grid gap-2 text-xs text-[#27342b] ${
            compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"
          }`}
        >
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">
              {inspection.dimensions.width} x {inspection.dimensions.height}
            </p>
            <p className="mt-1 text-[#626a61]">Dimensions</p>
          </div>
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">
              {inspection.contentBounds.width} x {inspection.contentBounds.height}
            </p>
            <p className="mt-1 text-[#626a61]">Visible content</p>
          </div>
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">
              x{inspection.contentBounds.x}, y{inspection.contentBounds.y}
            </p>
            <p className="mt-1 text-[#626a61]">Content box</p>
          </div>
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">
              {inspection.contentBounds.coveragePercentage}%
            </p>
            <p className="mt-1 text-[#626a61]">Content coverage</p>
          </div>
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">
              {formatBytes(inspection.fileSizeBytes)}
            </p>
            <p className="mt-1 text-[#626a61]">File size</p>
          </div>
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">
              {inspection.hasTransparency ? "Yes" : "No"}
            </p>
            <p className="mt-1 text-[#626a61]">Transparency</p>
          </div>
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">{inspection.blurScore}</p>
            <p className="mt-1 text-[#626a61]">Edge clarity</p>
          </div>
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">{inspection.dominantColors}</p>
            <p className="mt-1 text-[#626a61]">Main colors</p>
          </div>
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">{inspection.pixelationScore}</p>
            <p className="mt-1 text-[#626a61]">Blocky edges</p>
          </div>
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">{inspection.jpegArtifactScore}</p>
            <p className="mt-1 text-[#626a61]">JPG noise</p>
          </div>
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">
              {inspection.tinyDisconnectedRegions}
            </p>
            <p className="mt-1 text-[#626a61]">Tiny pieces</p>
          </div>
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">{inspection.textDensity}</p>
            <p className="mt-1 text-[#626a61]">Fine detail</p>
          </div>
          <div className="rounded-[8px] bg-white/70 p-3">
            <p className="font-semibold">
              {inspection.hasShadowOrPhotoBackground ? "Yes" : "No"}
            </p>
            <p className="mt-1 text-[#626a61]">Shadows/photo</p>
          </div>
        </div>
      ) : null}

      {showDebugDetails && inspection.scoreFactors.length ? (
        <details className="mt-4 rounded-[8px] border border-[#d8d2c8] bg-white/80 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#27342b]">
            Why this score?
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {inspection.scoreFactors.map((factor) => (
              <div
                key={`${factor.label}-${factor.points}`}
                className="flex items-center justify-between gap-3 rounded-[8px] bg-[#fbfaf7] px-3 py-2 text-sm"
              >
                <span
                  className={
                    factor.tone === "positive"
                      ? "font-medium text-[#315f46]"
                      : "font-medium text-[#8a4b18]"
                  }
                >
                  {factor.label}
                </span>
                <span
                  className={
                    factor.tone === "positive"
                      ? "font-semibold text-[#315f46]"
                      : "font-semibold text-[#8a3426]"
                  }
                >
                  {factor.points > 0 ? "+" : ""}
                  {factor.points}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {inspection.warnings.length ? (
        <ul className="mt-4 space-y-2 text-sm font-medium text-[#27342b]">
          {inspection.warnings.map((warning) => (
            <li key={warning}>- {warning}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
