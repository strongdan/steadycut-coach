import { useQuery } from "@tanstack/react-query";

import { api } from "../../lib/api";
import { authStorage } from "../../lib/auth";

type MeResponse = {
  user: {
    id: string;
    email: string;
    name: string;
    timezone: string;
    units: "imperial" | "metric";
  } | null;
};

export function useAuth() {
  const token = authStorage.getToken();

  return useQuery({
    queryKey: ["auth", "me", token],
    enabled: Boolean(token),
    queryFn: () => api<MeResponse>("/auth/me", { token }),
  });
}
