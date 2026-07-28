import { DrawerActions } from "@react-navigation/native";
import { useNavigation, usePathname, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import React from "react";
import Toast from "react-native-toast-message";

import Sidebar, { UserRole } from "../../components/navigation/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

type RouteMap = Record<string, string | null>;

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

function SidebarDrawerContent() {
  const router = useRouter();
  const navigation = useNavigation();
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
      navigation.dispatch(DrawerActions.closeDrawer());
      return;
    }

    router.push(target as any);
    navigation.dispatch(DrawerActions.closeDrawer());
  };

  const handleHelp = () => {
    Toast.show({
      type: "info",
      text1: "Coming Soon",
      text2: "Help & support will be available in a future update.",
    });
    navigation.dispatch(DrawerActions.closeDrawer());
  };

  return (
    <Sidebar activeRoute={activeRoute} onNavigate={handleNavigate} onHelp={handleHelp} />
  );
}

export default function AppDrawerLayout() {
  const { colors } = useTheme();

  return (
    <Drawer
      drawerContent={() => <SidebarDrawerContent />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitle: () => null,
        drawerType: "front",
        drawerStyle: { width: 300 },
        overlayColor: "rgba(0,0,0,0.4)",
      }}
    />
  );
}