// app/(app)/guidance/messages.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../../context/ThemeContext";
import { useLiveRefresh } from "../../../hooks/useLiveRefresh";
import {
  getGuidanceInbox,
  MessageCategory,
  MessageThreadStatus,
  MessageThreadSummary,
} from "../../../utils/api";

const CATEGORY_FILTERS: { label: string; value: MessageCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Help", value: "help" },
  { label: "Complaint", value: "complaint" },
  { label: "Concern", value: "concern" },
];

const STATUS_FILTERS: { label: string; value: MessageThreadStatus | "all" }[] =
  [
    { label: "All", value: "all" },
    { label: "Open", value: "open" },
    { label: "In Progress", value: "in_progress" },
    { label: "Resolved", value: "resolved" },
  ];

type InboxFilters = {
  category: MessageCategory | "all";
  status: MessageThreadStatus | "all";
  urgentOnly: boolean;
  search: string;
};

// A cheap fingerprint of the list, so background refreshes only
// re-render when something actually changed (new message, unread count,
// status, etc.).
function buildSignature(threads: MessageThreadSummary[]) {
  return threads
    .map((t) =>
      [
        t.id,
        t.status,
        t.category,
        t.urgent ? 1 : 0,
        t.unreadCount,
        t.lastMessageAt,
      ].join(":"),
    )
    .join("|");
}

export default function GuidanceMessagesScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  const [threads, setThreads] = useState<MessageThreadSummary[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<MessageCategory | "all">("all");
  const [status, setStatus] = useState<MessageThreadStatus | "all">("all");
  const [urgentOnly, setUrgentOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Always holds the filters currently on screen, so a slow response for
  // OLD filters can never overwrite the list for the NEW ones.
  const filtersRef = useRef<InboxFilters>({
    category,
    status,
    urgentOnly,
    search: debouncedSearch,
  });
  filtersRef.current = {
    category,
    status,
    urgentOnly,
    search: debouncedSearch,
  };

  const signatureRef = useRef("");
  const hasLoadedRef = useRef(false);
  const failureShownRef = useRef(false);
  const filtersReadyRef = useRef(false);

  const fetchThreads = useCallback(async (manual = false) => {
    const filters = filtersRef.current;
    const key = JSON.stringify(filters);
    const isCurrent = () => key === JSON.stringify(filtersRef.current);

    try {
      const res = await getGuidanceInbox({
        category: filters.category === "all" ? undefined : filters.category,
        status: filters.status === "all" ? undefined : filters.status,
        urgent: filters.urgentOnly ? true : undefined,
        search: filters.search.trim() || undefined,
      });

      if (!isCurrent()) return;

      hasLoadedRef.current = true;
      failureShownRef.current = false;
      setError(false);

      const signature = buildSignature(res.threads);

      if (signature !== signatureRef.current) {
        signatureRef.current = signature;
        setThreads(res.threads);
      }
    } catch (err: any) {
      if (!isCurrent()) return;

      setError(true);

      // Background refreshes stay silent. Only tell the counselor when
      // they asked for it, or once if the very first load fails.
      if (manual || (!hasLoadedRef.current && !failureShownRef.current)) {
        failureShownRef.current = true;

        Toast.show({
          type: "error",
          text1: "Failed to load messages",
          text2: err.response?.data?.message ?? "Please try again.",
        });
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Debounce the search box so we don't hit the server on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Filters changed: show the normal loading state and reload. (Skipped
  // on first mount because the live refresh below already loads then.)
  useEffect(() => {
    if (!filtersReadyRef.current) {
      filtersReadyRef.current = true;
      return;
    }

    setLoading(true);
    signatureRef.current = "";
    fetchThreads();
  }, [category, status, urgentOnly, debouncedSearch, fetchThreads]);

  // Quietly keeps the inbox current: on focus (so unread badges clear
  // when you return from a thread), on any new student message, on
  // reconnect, when the app returns to the foreground, and on a light
  // timer while this screen is open.
  useLiveRefresh(() => fetchThreads(false));

  const statusColors = (s: MessageThreadStatus) => {
    if (s === "resolved")
      return { bg: colors.success + "18", text: colors.success };
    if (s === "in_progress")
      return { bg: colors.warning + "18", text: colors.warning };
    return { bg: colors.secondaryBackground, text: colors.textSecondary };
  };

  const statusLabel = (s: MessageThreadStatus) =>
    s === "in_progress"
      ? "In Progress"
      : s === "resolved"
        ? "Resolved"
        : "Open";

  const renderThread = ({ item }: { item: MessageThreadSummary }) => {
    const sc = statusColors(item.status);

    return (
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/guidance/message/[id]",
            params: { id: String(item.id) },
          } as any)
        }
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${item.studentName}, ${item.category}, ${statusLabel(item.status)}${item.urgent ? ", urgent" : ""}`}
        style={[
          styles.threadCard,
          {
            backgroundColor: colors.surface,
            borderColor: item.urgent ? colors.danger : colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.sm,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: radius.round,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginRight: spacing.sm + 2,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
              {item.studentName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {item.studentName}
              </Text>

              {item.unreadCount > 0 && (
                <View
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: radius.round,
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: 5,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {item.unreadCount}
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
                gap: 6,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.secondaryBackground,
                  borderRadius: radius.sm,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {item.category.charAt(0).toUpperCase() +
                    item.category.slice(1)}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: sc.bg,
                  borderRadius: radius.sm,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{ fontSize: 11, fontWeight: "700", color: sc.text }}
                >
                  {statusLabel(item.status)}
                </Text>
              </View>

              {item.urgent && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.danger + "18",
                    borderRadius: radius.sm,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Ionicons
                    name="alert-circle"
                    size={12}
                    color={colors.danger}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: colors.danger,
                      marginLeft: 3,
                    }}
                  >
                    Urgent
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm + 4,
          paddingBottom: spacing.sm,
        }}
      >
        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: typography.title.fontSize,
            fontWeight: "700",
            color: colors.text,
          }}
          accessibilityRole="header"
        >
          Messages
        </Text>
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          Student help, complaint, and concern messages.
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <TextInput
          style={{
            backgroundColor: colors.secondaryBackground,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.sm + 2,
            paddingHorizontal: spacing.sm + 6,
            paddingVertical: spacing.sm + 2,
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.text,
            marginBottom: spacing.sm,
          }}
          placeholder="Search by student name or email"
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setDebouncedSearch(search)}
          returnKeyType="search"
          accessibilityLabel="Search students"
        />

        <FlatList
          horizontal
          data={CATEGORY_FILTERS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing.sm }}
          renderItem={({ item }) => {
            const active = category === item.value;
            return (
              <TouchableOpacity
                onPress={() => setCategory(item.value)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: radius.xl,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.surface,
                  marginRight: 8,
                }}
                accessibilityRole="button"
                accessibilityLabel={`Category filter: ${item.label}`}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: active ? "#FFFFFF" : colors.textSecondary,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: spacing.sm,
          }}
        >
          <FlatList
            horizontal
            data={STATUS_FILTERS}
            keyExtractor={(item) => item.value}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = status === item.value;
              return (
                <TouchableOpacity
                  onPress={() => setStatus(item.value)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : colors.surface,
                    marginRight: 8,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Status filter: ${item.label}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: active ? "#FFFFFF" : colors.textSecondary,
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <TouchableOpacity
          onPress={() => setUrgentOnly((v) => !v)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: urgentOnly ? colors.danger : colors.border,
            backgroundColor: urgentOnly ? colors.danger + "18" : colors.surface,
            marginBottom: spacing.md,
          }}
          accessibilityRole="button"
          accessibilityLabel="Urgent only filter"
          accessibilityState={{ selected: urgentOnly }}
        >
          <Ionicons
            name="alert-circle"
            size={14}
            color={urgentOnly ? colors.danger : colors.textSecondary}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: urgentOnly ? colors.danger : colors.textSecondary,
              marginLeft: 5,
            }}
          >
            Urgent only
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderThread}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 40,
          }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchThreads(true);
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Ionicons
                name={
                  error
                    ? "cloud-offline-outline"
                    : "chatbubble-ellipses-outline"
                }
                size={32}
                color={colors.textSecondary}
              />
              <Text
                style={{
                  color: colors.textSecondary,
                  marginTop: spacing.sm,
                  textAlign: "center",
                }}
              >
                {error
                  ? "We couldn't load messages. Pull down to retry."
                  : "No messages match your filters."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  threadCard: { borderWidth: 1 },
});
