import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AUTH_EXPIRED_EVENT } from "../api/client";
import { AuthContext } from "./useAuth";
import {
  changeCurrentPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  updateCurrentUser,
} from "../api/auth";


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleExpiredSession = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);

    return () => {
      window.removeEventListener(
        AUTH_EXPIRED_EVENT,
        handleExpiredSession,
      );
    };
  }, []);

  const refreshUser = useCallback(async ({ signal } = {}) => {
    try {
      const currentUser = await getCurrentUser({ signal });
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      if (error?.name === "AbortError") throw error;

      if ([401, 403].includes(error?.status)) {
        setUser(null);
        return null;
      }

      throw error;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    refreshUser({ signal: controller.signal })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [refreshUser]);

  const signIn = useCallback(async (credentials) => {
    const response = await loginUser(credentials);
    setUser(response.user);
    return response.user;
  }, []);

  const signUp = useCallback(async (values) => {
    const response = await registerUser(values);
    setUser(response.user);
    return response.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (values) => {
    const updated = await updateCurrentUser(values);
    setUser(updated);
    return updated;
  }, []);

  const changePassword = useCallback(async (values) => {
    return changeCurrentPassword(values);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      refreshUser,
      signIn,
      signUp,
      signOut,
      updateProfile,
      changePassword,
    }),
    [
      user,
      loading,
      refreshUser,
      signIn,
      signUp,
      signOut,
      updateProfile,
      changePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
