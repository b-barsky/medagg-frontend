import { Spin } from "antd";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./useAuth";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "grid", minHeight: 320, placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
