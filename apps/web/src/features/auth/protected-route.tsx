import { Navigate, Outlet } from "react-router-dom";

import { authStorage } from "../../lib/auth";

export function ProtectedRoute() {
  const token = authStorage.getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
