import { requestJson } from "./client";

export function getDatasets({ page = 1, signal } = {}) {
  const parameters = new URLSearchParams({ page: String(page) });

  return requestJson(
    `/datasets/?${parameters.toString()}`,
    { signal },
    "Failed to load datasets",
  );
}

export function getDatasetById(id, { signal } = {}) {
  return requestJson(
    `/datasets/${encodeURIComponent(id)}/`,
    { signal },
    "Dataset not found",
  );
}

export function createSearchRun(
  query,
  sources,
  { providerPage = 1, signal } = {},
) {
  const body = { query, provider_page: providerPage };

  if (Array.isArray(sources)) {
    body.sources = sources;
  }

  return requestJson(
    "/search/datasets/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    },
    "Failed to create search",
  );
}

export function getSearchRun(
  searchRunId,
  { page = 1, pageSize = 20, signal } = {},
) {
  const parameters = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return requestJson(
    `/search/datasets/${encodeURIComponent(searchRunId)}/?${parameters.toString()}`,
    { cache: "no-store", signal },
    "Failed to refresh search",
  );
}

export function createDatasetImport(
  sourceDatasetId,
  licenseFingerprint,
  { signal } = {},
) {
  return requestJson(
    "/datasets/imports/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_dataset_id: sourceDatasetId,
        accept_license: true,
        license_fingerprint: licenseFingerprint,
      }),
      signal,
    },
    "Failed to start dataset import",
  );
}

export function getDatasetImport(importId, { signal } = {}) {
  return requestJson(
    `/datasets/imports/${encodeURIComponent(importId)}/`,
    { cache: "no-store", signal },
    "Failed to refresh dataset import",
  );
}

export function getArtifactDownload(artifactId, { signal } = {}) {
  return requestJson(
    `/datasets/artifacts/${encodeURIComponent(artifactId)}/download/`,
    { cache: "no-store", signal },
    "Failed to prepare artifact download",
  );
}
