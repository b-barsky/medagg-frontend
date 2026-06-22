import { requestJson } from "./client";

export function getCurrentUser({ signal } = {}) {
  return requestJson(
    "/users/me/",
    { cache: "no-store", signal },
    "Failed to load the current user",
  );
}

export function loginUser(credentials, { signal } = {}) {
  return requestJson(
    "/users/auth/login/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      signal,
    },
    "Failed to sign in",
  );
}

export function registerUser(values, { signal } = {}) {
  return requestJson(
    "/users/auth/register/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      signal,
    },
    "Failed to create an account",
  );
}

export function logoutUser({ signal } = {}) {
  return requestJson(
    "/users/auth/logout/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal,
    },
    "Failed to sign out",
  );
}

export function updateCurrentUser(values, { signal } = {}) {
  return requestJson(
    "/users/me/",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      signal,
    },
    "Failed to update the profile",
  );
}

export function changeCurrentPassword(values, { signal } = {}) {
  return requestJson(
    "/users/me/password/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      signal,
    },
    "Failed to change the password",
  );
}
