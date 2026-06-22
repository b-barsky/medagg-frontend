import { Spin } from "antd";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "./useAuth";

export default function GuestRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "grid", minHeight: "100vh", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/profile" replace /> : <Outlet />;
}
