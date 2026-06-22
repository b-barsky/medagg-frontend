const API_URL = (
  import.meta.env.VITE_API_URL ?? "/api/v1"
).replace(/\/+$/, "");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);
const NOT_AUTHENTICATED_DETAIL =
  "Authentication credentials were not provided.";

export const AUTH_EXPIRED_EVENT = "medagg:auth-expired";

let csrfRequest = null;

export class ApiError extends Error {
  constructor(message, { status = 0, payload = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function cookieValue(name) {
  const cookie = globalThis.document?.cookie ?? "";
  const prefix = `${encodeURIComponent(name)}=`;

  for (const part of cookie.split(";")) {
    const value = part.trim();

    if (value.startsWith(prefix)) {
      return decodeURIComponent(value.slice(prefix.length));
    }
  }

  return null;
}

function firstValidationMessage(value) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstValidationMessage(item);
      if (message) return message;
    }
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstValidationMessage(item);
      if (message) return message;
    }
  }

  return "";
}

function payloadMessage(payload, fallback) {
  return (
    firstValidationMessage(payload?.detail) ||
    firstValidationMessage(payload) ||
    fallback
  );
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function validatedPayload(response, payload, fallbackMessage) {
  if (!response.ok) {
    throw new ApiError(
      payloadMessage(payload, fallbackMessage),
      {
        status: response.status,
        payload,
      },
    );
  }

  return payload;
}

function responseMeansSessionExpired(response, payload) {
  if (response.status === 401) {
    return true;
  }

  return (
    response.status === 403 &&
    firstValidationMessage(payload?.detail) === NOT_AUTHENTICATED_DETAIL
  );
}

export function apiErrorMessage(error, fallback = "Request failed") {
  return (
    firstValidationMessage(error?.payload?.detail) ||
    firstValidationMessage(error?.payload) ||
    error?.message ||
    fallback
  );
}

export async function ensureCsrfToken({ force = false } = {}) {
  const existing = cookieValue("csrftoken");

  if (existing && !force) {
    return existing;
  }

  if (!csrfRequest || force) {
    csrfRequest = fetch(`${API_URL}/users/auth/csrf/`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await readJson(response);
        return validatedPayload(
          response,
          payload,
          "Failed to initialize CSRF",
        );
      })
      .then((payload) => payload?.csrf_token ?? cookieValue("csrftoken"))
      .finally(() => {
        csrfRequest = null;
      });
  }

  return csrfRequest;
}

export async function requestJson(
  path,
  options = {},
  fallbackMessage = "Request failed",
) {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", "application/json");

  if (!SAFE_METHODS.has(method)) {
    const token = await ensureCsrfToken();

    if (token) {
      headers.set("X-CSRFToken", token);
    }
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      ...options,
      method,
      headers,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      "Cannot reach the backend API. Check that Django and the frontend proxy are running.",
      { payload: null },
    );
  }

  if (response.status === 204) {
    return null;
  }

  const payload = await readJson(response);

  if (
    !path.startsWith("/users/auth/") &&
    responseMeansSessionExpired(response, payload)
  ) {
    globalThis.window?.dispatchEvent(
      new CustomEvent(AUTH_EXPIRED_EVENT),
    );
  }

  return validatedPayload(response, payload, fallbackMessage);
}
