import { Navigate, createBrowserRouter } from "react-router-dom";

import { CheckInScreen } from "../features/checkins/check-in-screen";
import { DashboardScreen } from "../features/dashboard/dashboard-screen";
import { AdminScreen } from "../features/dashboard/admin-screen";
import { AppShell } from "../features/layout/app-shell";
import { ProfileScreen } from "../features/layout/profile-screen";
import { ForgotPasswordScreen, LoginScreen, LandingScreen, RegisterScreen } from "../features/auth/auth-screens";
import { ProtectedRoute } from "../features/auth/protected-route";
import { PlanScreen } from "../features/plan/plan-screen";
import { SettingsScreen } from "../features/settings/settings-screen";

export const router = createBrowserRouter([
  { path: "/", element: <LandingScreen /> },
  { path: "/login", element: <LoginScreen /> },
  { path: "/register", element: <RegisterScreen /> },
  { path: "/forgot-password", element: <ForgotPasswordScreen /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/app",
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/app/dashboard" replace /> },
          { path: "dashboard", element: <DashboardScreen /> },
          { path: "check-in", element: <CheckInScreen /> },
          { path: "plan", element: <PlanScreen /> },
          { path: "settings", element: <SettingsScreen /> },
          { path: "profile", element: <ProfileScreen /> },
          { path: "admin", element: <AdminScreen /> },
        ],
      },
    ],
  },
]);
