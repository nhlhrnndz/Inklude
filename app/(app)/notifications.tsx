// app/(app)/notifications.tsx
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    AppNotification,
    useNotifications,
} from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  announcement: "megaphone-outline",
  message: "chatbubble-ellipses-outline",
  sis_reminder: "document-text-outline",
  class_started: "radio-outline",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handlePress = (item: AppNotification) => {
    setExpandedId((prev) => (prev === item.id ? null : item.id));
    if (!item.isRead) markRead(item.id);
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const expanded = expandedId === item.id;
    const icon = TYPE_ICONS[item.type] ?? "notifications-outline";

    return (
      <Pressable
        onPress={() => handlePress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.isRead ? "" : "Unread. "}${item.title}. ${timeAgo(item.createdAt)}`}
        accessibilityHint={
          item.body ? "Double tap to expand or collapse" : undefined
        }
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: item.isRead
              ? colors.surface
              : colors.primaryLight + "1A",
            borderColor: item.isRead ? colors.border : colors.primary,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.sm,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.primaryLight + "33",
              borderRadius: radius.round,
              marginRight: spacing.sm + 4,
            },
          ]}
        >
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text
              style={{
                flex: 1,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                fontWeight: item.isRead ? "500" : "700",
                color: colors.text,
              }}
              numberOfLines={expanded ? undefined : 2}
            >
              {item.title}
            </Text>
            {!item.isRead && (
              <View
                style={[styles.unreadDot, { backgroundColor: colors.primary }]}
              />
            )}
          </View>

          {!!item.body && (
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginTop: 4,
              }}
              numberOfLines={expanded ? undefined : 2}
            >
              {item.body}
            </Text>
          )}

          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.placeholder,
              marginTop: 6,
            }}
          >
            {timeAgo(item.createdAt)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["left", "right", "bottom"]}
    >
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
          },
        ]}
      >
        <View style={styles.flex}>
          <Text
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: typography.title.fontSize,
              fontWeight: "700",
              color: colors.text,
            }}
            accessibilityRole="header"
          >
            Notifications
          </Text>
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginTop: 2,
            }}
          >
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={markAllRead}
          disabled={unreadCount === 0}
          accessibilityRole="button"
          accessibilityLabel="Mark all notifications as read"
          accessibilityState={{ disabled: unreadCount === 0 }}
          hitSlop={8}
        >
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.caption.fontSize,
              fontWeight: "700",
              color: colors.primary,
              opacity: unreadCount === 0 ? 0.4 : 1,
            }}
          >
            Mark all as read
          </Text>
        </TouchableOpacity>
      </View>

      {loading && notifications.length === 0 ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading notifications"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          extraData={expandedId}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: 40,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons
                name="notifications-off-outline"
                size={40}
                color={colors.textSecondary}
              />
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.text,
                  marginTop: spacing.sm,
                }}
              >
                No notifications yet.
              </Text>
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                Announcements and updates will show up here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
    marginTop: 5,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
});
