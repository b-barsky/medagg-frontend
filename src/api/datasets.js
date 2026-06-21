const API_URL = (
  import.meta.env.VITE_API_URL ??
  "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

async function parseResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = payload?.detail ?? payload ?? fallbackMessage;

    throw new Error(
      typeof detail === "string"
        ? detail
        : JSON.stringify(detail),
    );
  }

  return payload;
}

function buildQueryParameters(filters, page) {
  const parameters = new URLSearchParams({
    page: String(page),
  });

  Object.entries(filters ?? {}).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        parameters.set(name, value.join(","));
      }

      return;
    }

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      parameters.set(name, String(value));
    }
  });

  return parameters;
}

export async function getDatasets({
  page = 1,
  signal,
} = {}) {
  const parameters = new URLSearchParams({
    page: String(page),
  });

  const response = await fetch(
    `${API_URL}/datasets/?${parameters.toString()}`,
    { signal },
  );

  return parseResponse(
    response,
    "Failed to load datasets",
  );
}

export async function getDatasetById(
  id,
  { signal } = {},
) {
  const response = await fetch(
    `${API_URL}/datasets/${encodeURIComponent(id)}/`,
    { signal },
  );

  return parseResponse(
    response,
    "Dataset not found",
  );
}

export async function searchDatasets(
  query,
  filters = {},
  {
    page = 1,
    signal,
  } = {},
) {
  const parameters = buildQueryParameters(filters, page);

  const response = await fetch(
    `${API_URL}/search/datasets/?${parameters.toString()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      signal,
    },
  );

  return parseResponse(response, "Search failed");
}