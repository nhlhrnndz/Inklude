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
import { getGuidanceInbox, MessageThreadSummary } from "../../../utils/api";

function buildSignature(threads: MessageThreadSummary[]) {
  return threads
    .map((t) => [t.id, t.unreadCount, t.lastMessageAt].join(":"))
    .join("|");
}

export default function GuidanceMessagesScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  const [threads, setThreads] = useState<MessageThreadSummary[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Holds the search currently on screen so a slow response for an OLD
  // search can never overwrite the list for the NEW one.
  const searchRef = useRef(debouncedSearch);
  searchRef.current = debouncedSearch;

  const signatureRef = useRef("");
  const hasLoadedRef = useRef(false);
  const failureShownRef = useRef(false);
  const searchReadyRef = useRef(false);

  const fetchThreads = useCallback(async (manual = false) => {
    const term = searchRef.current;
    const isCurrent = () => term === searchRef.current;

    try {
      const res = await getGuidanceInbox({ search: term.trim() || undefined });

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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Search changed: reload (skipped on first mount; the live refresh loads then).
  useEffect(() => {
    if (!searchReadyRef.current) {
      searchReadyRef.current = true;
      return;
    }
    setLoading(true);
    signatureRef.current = "";
    fetchThreads();
  }, [debouncedSearch, fetchThreads]);

  useLiveRefresh(() => fetchThreads(false));

  const renderThread = ({ item }: { item: MessageThreadSummary }) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/guidance/message/[id]",
          params: { id: String(item.id) },
        } as any)
      }
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${item.studentName}${
        item.unreadCount > 0 ? `, ${item.unreadCount} unread` : ""
      }`}
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                  style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}
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
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );

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
          Conversations with students.
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
            marginBottom: spacing.md,
          }}
          placeholder="Search by student name or email"
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setDebouncedSearch(search)}
          returnKeyType="search"
          accessibilityLabel="Search students"
        />
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
                  : "No messages yet."}
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
});
