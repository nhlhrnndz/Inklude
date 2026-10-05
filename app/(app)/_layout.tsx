// app/(app)/_layout.tsx
import { usePathname, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Platform, useWindowDimensions } from "react-native";
import Toast from "react-native-toast-message";

import Sidebar, { UserRole } from "../../components/navigation/Sidebar";
import NotificationBell from "../../components/notifications/NotificationBell";
import SensorySync from "../../components/SensorySync";
import { AccessibilityProvider } from "../../context/AccessibilityContext";
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
    mySessions: "/my-classes",
    joinSession: "/join",
    checkins: "/checkins",
    guidance: "/guidance-hub",
    reportIssue: "/report-issue",
    events: "/events",
    accessibilityMap: "/accessibility-map",
    settings: "/settings",
    accessibility: "/accessibility",
    sis: "/sis",
    appointments: "/guidance/appointments",
  },
  teacher: {
    dashboard: "/teacher",
    createSession: "/create-session",
    mySessions: "/my-classes",
    checkins: "/checkins",
    announcements: "/announcements",
    referrals: "/referrals",
    profile: "/profile",
  },
  guidance: {
    dashboard: "/guidance-dashboard",
    students: "/guidance/students",
    appointments: "/guidance/appointments",
    messages: "/guidance/messages",
    accessibilityReports: "/guidance/accessibility-reports",
    events: "/events",
    accessibilityMap: "/accessibility-map",
    reports: "/guidance/reports",
    announcements: "/announcements",
    profile: "/profile",
    settings: null,
  },
};

function isKnownRole(role: string | undefined): role is UserRole {
  return role === "student" || role === "teacher" || role === "guidance";
}

function findActiveKey(role: UserRole, pathname: string): string {
  const routes = ROUTES_BY_ROLE[role];

  if (
    role === "student" &&
    (pathname === "/messages" || pathname === "/guidance/appointments")
  ) {
    return "guidance";
  }
  if (role === "student" && pathname === "/my-reports") return "reportIssue";

  // Profile screens now live under Settings for students
  if (
    role === "student" &&
    ["/profile", "/edit-profile", "/change-password", "/display-name"].includes(
      pathname,
    )
  ) {
    return "settings";
  }

  const match = Object.entries(routes).find(([, path]) => path === pathname);
  return match ? match[0] : "dashboard";
}

function SidebarDrawerContent({ navigation }: SidebarDrawerContentProps) {
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
  const { width } = useWindowDimensions();

  // On a computer screen the sidebar stays open like a real dashboard.
  // Phones (and narrow browser windows) keep the slide-out drawer.
  const isDesktop = Platform.OS === "web" && width >= 1024;

  return (
    <AccessibilityProvider>
      <NotificationProvider>
        <SensorySync />
        <Drawer
          drawerContent={(props) => <SidebarDrawerContent {...props} />}
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerShadowVisible: false,
            headerTintColor: colors.primary,
            headerTitle: () => null,
            // Hide the burger on desktop (web) where the drawer is
            // already permanent. On phone / narrow web, keep the default
            // burger so the user can open the slide-out drawer.
            headerLeft: isDesktop ? () => null : undefined,
            headerRight: () => <NotificationBell />,
            drawerType: isDesktop ? "permanent" : "front",
            drawerStyle: {
              width: 300,
            },
            overlayColor: isDesktop ? "transparent" : "rgba(0,0,0,0.4)",
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
    </AccessibilityProvider>
  );
}
