// context/NotificationContext.tsx
import { useRouter } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import Toast from "react-native-toast-message";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../utils/api";
import { resolveNotificationRoute } from "../utils/notificationRouter";
import { getSocket } from "../utils/socket";
import { useAuth } from "./AuthContext";

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  sourceType: string | null;
  sourceId: number | null;
  senderId: number | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

type LivePayload = {
  type: string;
  title: string;
  body: string | null;
  sourceType: string | null;
  sourceId: number | null;
};

type NotificationContextType = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { token, user } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Refs let the socket handler (registered once per login) always see the
  // latest values without re-subscribing.
  const notificationsRef = useRef<AppNotification[]>([]);
  notificationsRef.current = notifications;
  const roleRef = useRef<string | null>(user?.role ?? null);
  roleRef.current = user?.role ?? null;
  const routerRef = useRef(router);
  routerRef.current = router;

  const refresh = useCallback(async () => {
    try {
      const data = await getNotifications({ limit: 50 });
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      console.log("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(
    async (id: number) => {
      // Optimistic update, then confirm the real count from the server
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      try {
        const data = await markNotificationRead(id);
        setUnreadCount(data.unreadCount ?? 0);
      } catch (err) {
        console.log("Failed to mark notification read:", err);
        refresh();
      }
    },
    [refresh],
  );

  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.log("Failed to mark all notifications read:", err);
      refresh();
    }
  }, [refresh]);

  // Initial load
  useEffect(() => {
    if (token) refresh();
  }, [token, refresh]);

  // Real-time delivery via Socket.IO
  useEffect(() => {
    if (!token) return;

    const socket = getSocket();

    // Rooms are lost on reconnect, so register every time we (re)connect,
    // and catch up on anything missed while disconnected.
    const register = () => {
      socket.emit("register-user", { token });
      refresh();
    };

    // Tapping the toast goes to the same place as tapping the list item.
    const openFromToast = (payload: LivePayload) => {
      Toast.hide();
      const route = resolveNotificationRoute(payload, roleRef.current);
      if (!route) return;

      // The list was refreshed when the toast appeared, so the matching row
      // is normally there. Mark it read so the badge stays honest.
      const match = notificationsRef.current.find(
        (n) =>
          !n.isRead &&
          n.type === payload.type &&
          n.sourceType === payload.sourceType &&
          n.sourceId === payload.sourceId,
      );
      if (match) markReadRef.current(match.id);

      routerRef.current.push(route as any);
    };

    const handleNew = (payload: LivePayload) => {
      refresh();
      Toast.show({
        type: "info",
        text1: payload.title,
        text2: payload.body ?? undefined,
        visibilityTime: 4000,
        onPress: () => openFromToast(payload),
      });
    };

    if (socket.connected) register();
    socket.on("connect", register);
    socket.on("notification:new", handleNew);

    return () => {
      socket.off("connect", register);
      socket.off("notification:new", handleNew);
      // Don't let the next login on this device inherit this user's room
      socket.emit("unregister-user");
    };
  }, [token, refresh]);

  // Refresh when the app comes back to the foreground
  useEffect(() => {
    if (!token) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [token, refresh]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, loading, refresh, markRead, markAllRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return context;
};
