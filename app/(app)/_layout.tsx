// app/(app)/_layout.tsx
import { usePathname, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import Toast from "react-native-toast-message";

import Sidebar, { UserRole } from "../../components/navigation/Sidebar";
import NotificationBell from "../../components/notifications/NotificationBell";
import { useAuth } from "../../context/AuthContext";
import { NotificationProvider } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";

type RouteMap = Record<string, string | null>;

type SidebarDrawerContentProps = {
  navigation: { closeDrawer: () => void };
};

const ROUTES_BY_ROLE: Record<UserRole, RouteMap> = {
  student: {
    dashboard: "/student",
    mySessions: "/my-sessions",
    joinSession: "/join",
    notifications: "/notifications",
    guidance: null,
    profile: "/profile",
    settings: null,
    accessibility: "/accessibility",
    sis: "/sis",
  },

  teacher: {
    dashboard: "/teacher",
    createSession: "/create-session",
    mySessions: "/my-sessions",
    announcements: "/announcements",
    notifications: "/notifications",
    students: null,
    profile: "/profile",
    settings: null,
  },

  guidance: {
    dashboard: "/guidance-dashboard",
    students: "/guidance-dashboard",
    sessions: null,
    reports: null,
    announcements: "/announcements",
    notifications: "/notifications",
    profile: "/profile",
    settings: null,
  },
};

function isKnownRole(role: string | undefined): role is UserRole {
  return role === "student" || role === "teacher" || role === "guidance";
}

function findActiveKey(role: UserRole, pathname: string): string {
  const routes = ROUTES_BY_ROLE[role];

  const match = Object.entries(routes).find(
    ([, path]) => path === pathname,
  );

  return match ? match[0] : "dashboard";
}

function SidebarDrawerContent({
  navigation,
}: SidebarDrawerContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const role: UserRole = isKnownRole(user?.role)
    ? user.role
    : "student";

  const activeRoute = findActiveKey(role, pathname);

  const handleNavigate = (key: string) => {
    const target = ROUTES_BY_ROLE[role][key];

    if (!target) {
      Toast.show({
        type: "info",
        text1: "Coming Soon",
        text2:
          "This section will be available in a future update.",
      });

      navigation.closeDrawer();
      return;
    }

    router.replace(target as any);
    navigation.closeDrawer();
  };

  const handleHelp = () => {
    Toast.show({
      type: "info",
      text1: "Coming Soon",
      text2:
        "Help & support will be available in a future update.",
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
    <NotificationProvider>
      <Drawer
        drawerContent={(props) => (
          <SidebarDrawerContent {...props} />
        )}
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitle: () => null,
          headerRight: () => <NotificationBell />,
          drawerType: "front",
          drawerStyle: {
            width: 300,
          },
          overlayColor: "rgba(0,0,0,0.4)",
        }}
      >
        <Drawer.Screen
          name="notifications"
          options={{
            headerRight: () => null,
          }}
        />
      </Drawer>
    </NotificationProvider>
  );
}