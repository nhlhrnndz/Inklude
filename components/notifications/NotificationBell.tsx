// components/notifications/NotificationBell.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNotifications } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";

export default function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const { colors } = useTheme();

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      }
      hitSlop={8}
      style={styles.button}
    >
      <Ionicons
        name={unreadCount > 0 ? "notifications" : "notifications-outline"}
        size={26}
        color={colors.primary}
      />
      {unreadCount > 0 && (
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.danger, borderColor: colors.background },
          ]}
        >
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});
