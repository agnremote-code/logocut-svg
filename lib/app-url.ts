type AppUrlEnvironment = {
  NEXT_PUBLIC_APP_URL?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
};

function normalizeExplicitUrl(value: string | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, "");

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return trimmed;
  } catch {
    return null;
  }
}

function getVercelHttpsUrl(value: string | undefined) {
  const hostname = value
    ?.trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");

  if (!hostname || !/^[a-z0-9.-]+(?::\d+)?$/i.test(hostname)) {
    return null;
  }

  return `https://${hostname}`;
}

export function resolveAppUrl(
  environment: AppUrlEnvironment | NodeJS.ProcessEnv = process.env,
) {
  const explicitUrl = normalizeExplicitUrl(environment.NEXT_PUBLIC_APP_URL);

  if (explicitUrl) {
    return explicitUrl;
  }

  if (environment.VERCEL_ENV === "preview") {
    const branchUrl = getVercelHttpsUrl(environment.VERCEL_BRANCH_URL);

    if (branchUrl) {
      return branchUrl;
    }
  }

  return (
    getVercelHttpsUrl(environment.VERCEL_URL) ?? "http://localhost:3000"
  );
}
