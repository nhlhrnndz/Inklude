// context/NotificationContext.tsx
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { AppState } from "react-native";
import Toast from "react-native-toast-message";

import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "../utils/api";
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
  const { token } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

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

    const handleNew = (payload: { title: string; body: string | null }) => {
      refresh();
      Toast.show({
        type: "info",
        text1: payload.title,
        text2: payload.body ?? undefined,
        visibilityTime: 4000,
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
