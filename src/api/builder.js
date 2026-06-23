import { requestJson } from "./client";

export function getBuilderLibrary({ signal } = {}) {
  return requestJson(
    "/builder/library/",
    { cache: "no-store", signal },
    "Failed to load builder library",
  );
}

export function getBuilderAnalysis(analysisId, { signal } = {}) {
  return requestJson(
    `/builder/analyses/${encodeURIComponent(analysisId)}/`,
    { cache: "no-store", signal },
    "Failed to load dataset analysis",
  );
}

export function retryBuilderAnalysis(analysisId, { signal } = {}) {
  return requestJson(
    `/builder/analyses/${encodeURIComponent(analysisId)}/retry/`,
    { method: "POST", signal },
    "Failed to retry dataset analysis",
  );
}

export function listBuildRequests({ page = 1, signal } = {}) {
  const parameters = new URLSearchParams({ page: String(page) });
  return requestJson(
    `/builder/requests/?${parameters.toString()}`,
    { cache: "no-store", signal },
    "Failed to load build requests",
  );
}

export function getBuildRequest(requestId, { signal } = {}) {
  return requestJson(
    `/builder/requests/${encodeURIComponent(requestId)}/`,
    { cache: "no-store", signal },
    "Failed to load build request",
  );
}

export function createBuildRequest(values, { signal } = {}) {
  return requestJson(
    "/builder/requests/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      signal,
    },
    "Failed to create build request",
  );
}

export function executeBuildRequest(requestId, { signal } = {}) {
  return requestJson(
    `/builder/requests/${encodeURIComponent(requestId)}/execute/`,
    { method: "POST", signal },
    "Failed to execute transformation plan",
  );
}

export function getBuildRun(runId, { signal } = {}) {
  return requestJson(
    `/builder/runs/${encodeURIComponent(runId)}/`,
    { cache: "no-store", signal },
    "Failed to load build run",
  );
}

export function getBuildDownload(runId, { signal } = {}) {
  return requestJson(
    `/builder/runs/${encodeURIComponent(runId)}/download/`,
    { cache: "no-store", signal },
    "Failed to prepare derived dataset download",
  );
}
