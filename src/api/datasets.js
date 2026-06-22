const API_URL = (
  import.meta.env.VITE_API_URL ??
  "/api/v1"
).replace(/\/+$/, "");

function apiLocation() {
  if (/^https?:\/\//i.test(API_URL)) {
    return API_URL;
  }

  const origin = globalThis.location?.origin;

  return origin ? `${origin}${API_URL}` : API_URL;
}

async function parseResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = payload?.detail ?? payload ?? fallbackMessage;
    const error = new Error(
      typeof detail === "string"
        ? detail
        : JSON.stringify(detail),
    );

    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function requestJson(
  url,
  options,
  fallbackMessage,
) {
  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    const networkError = new Error(
      `Cannot reach the backend API at ${apiLocation()}. ` +
        "Check that Django is running on port 8000 and that " +
        "VITE_API_URL/VITE_DEV_API_TARGET are configured correctly.",
    );

    networkError.name = "ApiNetworkError";
    networkError.isNetworkError = true;
    networkError.cause = error;
    throw networkError;
  }

  return parseResponse(response, fallbackMessage);
}

export async function getDatasets({
  page = 1,
  signal,
} = {}) {
  const parameters = new URLSearchParams({
    page: String(page),
  });

  return requestJson(
    `${API_URL}/datasets/?${parameters.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
      signal,
    },
    "Failed to load datasets",
  );
}

export async function getDatasetById(
  id,
  { signal } = {},
) {
  return requestJson(
    `${API_URL}/datasets/${encodeURIComponent(id)}/`,
    {
      headers: {
        Accept: "application/json",
      },
      signal,
    },
    "Dataset not found",
  );
}

export async function createSearchRun(
  query,
  sources,
  {
    providerPage = 1,
    signal,
  } = {},
) {
  const body = {
    query,
    provider_page: providerPage,
  };

  if (Array.isArray(sources)) {
    body.sources = sources;
  }

  return requestJson(
    `${API_URL}/search/datasets/`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    },
    "Failed to create search",
  );
}

export async function getSearchRun(
  searchRunId,
  {
    page = 1,
    pageSize = 20,
    signal,
  } = {},
) {
  const parameters = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return requestJson(
    `${API_URL}/search/datasets/${encodeURIComponent(
      searchRunId,
    )}/?${parameters.toString()}`,
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
    "Failed to refresh search",
  );
}
