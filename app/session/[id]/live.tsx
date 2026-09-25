import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { useCaptionSession } from "../../../hooks/useCaptionSession";
import { useMicCaptioning } from "../../../hooks/useMicCaptioning";
import { getSessionDetails } from "../../../utils/api";
import { crossAlert } from "../../../utils/crossAlert";
import { getSocket } from "../../../utils/socket";

interface Session {
  id: number;
  code: string;
  title: string;
  status: "active" | "ended";
  participants: { id: number }[];
}

export default function LiveCaptioningScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const isTeacher = user?.role === "teacher";

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewboardConnected, setViewboardConnected] = useState(false);

  const { captions, connected, sessionEnded, sendCaption } = useCaptionSession(
    id,
    user?.id,
    isTeacher ? "teacher" : "student",
  );

  const {
    isRecording,
    error: micError,
    startCaptioning,
    stopCaptioning,
  } = useMicCaptioning((text) => sendCaption(text));

  useEffect(() => {
    (async () => {
      try {
        const data = await getSessionDetails(Number(id));
        setSession(data.session);
      } catch (error) {
        console.error("Error loading classroom:", error);
        crossAlert("Error", "Failed to load classroom details");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // "Viewboard connected" indicator, teacher only
  useEffect(() => {
    if (!isTeacher) return;
    const socket = getSocket();
    function handleStatus({ connected }: { connected: boolean }) {
      setViewboardConnected(connected);
    }
    socket.on("viewboard-status", handleStatus);
    return () => {
      socket.off("viewboard-status", handleStatus);
    };
  }, [isTeacher]);

  const goBackToClassroom = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(`/session/${id}` as any);
  };

  const openViewboard = () => {
    if (Platform.OS === "web") {
      window.open(`/viewboard/${id}`, "_blank");
    } else {
      router.push(`/viewboard/${id}` as any);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const joinedCount = session?.participants.length ?? 0;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.topBar,
          { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBackToClassroom}
          accessibilityRole="button"
          accessibilityLabel="Back to classroom"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              color: colors.primary,
              fontSize: typography.body.fontSize,
              marginLeft: 6,
            }}
          >
            Classroom
          </Text>
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          <View style={styles.metaChip}>
            <Ionicons
              name="people-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginLeft: 4,
              }}
            >
              {joinedCount} joined
            </Text>
          </View>

          <View style={styles.metaChip}>
            <View
              style={[
                styles.socketDot,
                { backgroundColor: connected ? "#4caf50" : "#e94560" },
              ]}
            />
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginLeft: 4,
              }}
            >
              {connected ? "Connected" : "Connecting..."}
            </Text>
          </View>
        </View>
      </View>

      <Text
        style={{
          fontFamily: typography.title.fontFamily,
          fontSize: typography.title.fontSize,
          fontWeight: "700",
          color: colors.text,
          paddingHorizontal: spacing.lg,
          marginTop: spacing.sm,
        }}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {session?.title ?? "Live Captions"}
      </Text>

      {sessionEnded ? (
        <View style={[styles.centered, { flex: 1 }]}>
          <Ionicons
            name="checkmark-circle-outline"
            size={48}
            color={colors.textSecondary}
          />
          <Text
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: typography.title.fontSize,
              fontWeight: "700",
              color: colors.text,
              marginTop: spacing.md,
            }}
          >
            Class ended
          </Text>
          <TouchableOpacity
            onPress={goBackToClassroom}
            style={{ marginTop: spacing.md }}
            accessibilityRole="button"
            accessibilityLabel="Back to classroom"
          >
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                color: colors.primary,
                fontSize: typography.body.fontSize,
              }}
            >
              Back to Classroom
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {isTeacher && (
            <View
              style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}
            >
              <TouchableOpacity
                style={[
                  styles.micButton,
                  {
                    backgroundColor: isRecording ? "#e94560" : colors.primary,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  },
                ]}
                onPress={isRecording ? stopCaptioning : startCaptioning}
                accessibilityRole="button"
                accessibilityLabel={
                  isRecording ? "Stop Live Captioning" : "Start Live Captioning"
                }
              >
                <Text style={styles.micButtonText}>
                  {isRecording
                    ? "⏹ Stop Live Captioning"
                    : "🎙 Start Live Captioning"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.viewboardButton,
                  {
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    marginTop: spacing.sm,
                  },
                ]}
                onPress={openViewboard}
                accessibilityRole="button"
                accessibilityLabel="Open Classroom Viewboard"
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  🖥️ Open Classroom Viewboard
                  {viewboardConnected ? " • Connected" : ""}
                </Text>
              </TouchableOpacity>

              {micError && (
                <Text
                  style={{
                    color: "#e94560",
                    fontSize: 13,
                    marginTop: spacing.sm,
                  }}
                >
                  {micError}
                </Text>
              )}
            </View>
          )}

          {/* Captions — the dominant element on this screen */}
          <ScrollView
            style={styles.captionScroll}
            contentContainerStyle={{
              padding: spacing.lg,
              flexGrow: 1,
              justifyContent: captions.length === 0 ? "center" : "flex-start",
            }}
          >
            {captions.length === 0 ? (
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.title.fontSize,
                  color: colors.textSecondary,
                  textAlign: "center",
                  fontStyle: "italic",
                }}
              >
                {isTeacher
                  ? "Tap Start Live Captioning above to begin"
                  : "Listening… waiting for the teacher to speak"}
              </Text>
            ) : (
              captions.map((c, i) => (
                <Text
                  key={i}
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: 22,
                    lineHeight: 30,
                    color: colors.text,
                    marginBottom: spacing.md,
                  }}
                >
                  {c.text}
                </Text>
              ))
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: { flexDirection: "row", alignItems: "center" },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  metaChip: { flexDirection: "row", alignItems: "center" },
  socketDot: { width: 8, height: 8, borderRadius: 4 },
  micButton: { alignItems: "center" },
  micButtonText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  viewboardButton: { alignItems: "center", borderWidth: 1 },
  captionScroll: { flex: 1 },
});
