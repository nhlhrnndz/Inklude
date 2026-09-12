// app/(app)/_layout.tsx
import { usePathname, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import type { ComponentProps } from "react";
import Toast from "react-native-toast-message";

import Sidebar, { UserRole } from "../../components/navigation/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

type RouteMap = Record<string, string | null>;

// Inferred directly from expo-router's own <Drawer /> component, so it's
// always the exact shape expo-router actually passes at runtime —
// rather than the @react-navigation/drawer type, which looks similar
// but is a structurally different (and incompatible) type in this
// version of expo-router.
type DrawerContentProps = Parameters<
  NonNullable<ComponentProps<typeof Drawer>["drawerContent"]>
>[0];

const ROUTES_BY_ROLE: Record<UserRole, RouteMap> = {
  student: {
    dashboard: "/student",
    mySessions: "/my-sessions",
    joinSession: "/join",
    guidance: null,
    profile: "/profile",
    settings: null,
    accessibility: "/accessibility",
  },
  teacher: {
    dashboard: "/teacher",
    createSession: "/create-session",
    mySessions: "/my-sessions",
    students: null,
    profile: "/profile",
    settings: null,
  },
  guidance: {
    dashboard: "/guidance-dashboard",
    students: "/guidance-dashboard",
    sessions: null,
    reports: null,
    profile: "/profile",
    settings: null,
  },
};

function isKnownRole(role: string | undefined): role is UserRole {
  return role === "student" || role === "teacher" || role === "guidance";
}

function findActiveKey(role: UserRole, pathname: string): string {
  const routes = ROUTES_BY_ROLE[role];
  const match = Object.entries(routes).find(([, path]) => path === pathname);

  return match ? match[0] : "dashboard";
}

// Receives the real navigation object expo-router's <Drawer /> passes to
// drawerContent — props.navigation here IS the Drawer navigator's own
// navigation object, so props.navigation.closeDrawer() resolves correctly.
function SidebarDrawerContent({ navigation }: DrawerContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const role: UserRole = isKnownRole(user?.role) ? user.role : "student";
  const activeRoute = findActiveKey(role, pathname);

  const handleNavigate = (key: string) => {
    const target = ROUTES_BY_ROLE[role][key];

    if (!target) {
      Toast.show({
        type: "info",
        text1: "Coming Soon",
        text2: "This section will be available in a future update.",
      });

      navigation.closeDrawer();
      return;
    }

    // Sidebar items are top-level destinations.
    // Replace prevents repeatedly stacking sibling screens
    // in the navigation history.
    router.replace(target as any);
    navigation.closeDrawer();
  };

  const handleHelp = () => {
    Toast.show({
      type: "info",
      text1: "Coming Soon",
      text2: "Help & support will be available in a future update.",
    });

    navigation.closeDrawer();
  };

  return (
    <Sidebar
      activeRoute={activeRoute}
      onNavigate={handleNavigate}
      onHelp={handleHelp}
    />
  );
}

export default function AppDrawerLayout() {
  const { colors } = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <SidebarDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitle: () => null,
        drawerType: "front",
        drawerStyle: {
          width: 300,
        },
        overlayColor: "rgba(0,0,0,0.4)",
      }}
    />
  );
}