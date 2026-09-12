import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";

const ROLE_HOME: Record<string, string> = {
  student: "/student",
  teacher: "/teacher",
  guidance: "/guidance-dashboard",
};

export function useDashboardHome() {
  const { user } = useAuth();
  const router = useRouter();

  return () => {
    const home = ROLE_HOME[user?.role ?? "student"] ?? "/";
    router.replace(home as any);
  };
}
