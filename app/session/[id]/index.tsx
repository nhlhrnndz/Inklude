import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import {
    endSession,
    getSessionAnnouncements,
    getSessionDetails,
    postAnnouncement,
} from "../../../utils/api";
import { crossAlert } from "../../../utils/crossAlert";

interface Participant {
  id: number;
  name: string;
  email: string;
  joined_at: string;
}

interface Session {
  id: number;
  code: string;
  title: string;
  description: string;
  status: "active" | "ended";
  createdAt: string;
  endedAt: string | null;
  participants: Participant[];
}

interface Announcement {
  id: number;
  title: string;
  body: string;
  createdAt: string;
}

const ROLE_HOME: Record<string, string> = {
  student: "/student",
  teacher: "/teacher",
  guidance: "/guidance-dashboard",
};

const TITLE_MAX = 150;
const BODY_MAX = 2000;

type Tab = "people" | "announcements";

export default function ClassroomDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const isTeacher = user?.role === "teacher";

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [tab, setTab] = useState<Tab>("people");

  // Announcements (scoped to this classroom)
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [posting, setPosting] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const data = await getSessionDetails(Number(id));
      setSession(data.session);
    } catch (error) {
      console.error("Error loading classroom:", error);
      crossAlert("Error", "Failed to load classroom details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await getSessionAnnouncements(Number(id));
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error("Error loading announcements:", error);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSession();
    loadAnnouncements();
  }, [loadSession, loadAnnouncements]);

  const goToDashboard = () => {
    router.replace((ROLE_HOME[user?.role ?? "student"] ?? "/") as any);
  };

  const goBackToParent = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    goToDashboard();
  };

  const enterLive = () => {
    router.push(`/session/${id}/live` as any);
  };

  const handleEndSession = () => {
    crossAlert(
      "End Classroom Session?",
      "Are you sure you want to end this session?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "End", style: "destructive", onPress: confirmEndSession },
      ],
    );
  };

  const confirmEndSession = async () => {
    setEnding(true);
    try {
      await endSession(Number(id));
      crossAlert("Success", "Session ended successfully", [
        { text: "OK", onPress: goToDashboard },
      ]);
    } catch (error) {
      console.error("Error ending session:", error);
      crossAlert("Error", "Failed to end session");
    } finally {
      setEnding(false);
    }
  };

  const handleLeaveSession = () => {
    crossAlert(
      "Leave Classroom?",
      "You can rejoin later using the classroom code.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: goToDashboard },
      ],
    );
  };

  const handlePostAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) {
      crossAlert("Missing details", "Please enter both a title and a message.");
      return;
    }

    setPosting(true);
    try {
      await postAnnouncement({
        title: annTitle.trim(),
        body: annBody.trim(),
        sessionId: Number(id),
      });
      setAnnTitle("");
      setAnnBody("");
      await loadAnnouncements();
    } catch (error: any) {
      crossAlert(
        "Error",
        error.response?.data?.message || "Failed to post announcement",
      );
    } finally {
      setPosting(false);
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

  if (!session) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.text,
            marginBottom: spacing.md,
          }}
        >
          Classroom not found
        </Text>
        <TouchableOpacity
          onPress={goBackToParent}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              color: colors.primary,
              fontSize: typography.body.fontSize,
            }}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isActive = session.status === "active";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[styles.backButton, { marginBottom: spacing.md }]}
            onPress={goBackToParent}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Returns to the screen you came from"
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
              Back
            </Text>
          </TouchableOpacity>

          {/* Banner */}
          <View
            style={[
              styles.banner,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.lg,
                marginBottom: spacing.lg,
              },
            ]}
          >
            <View style={styles.bannerHeaderRow}>
              <Text
                style={{
                  fontFamily: typography.h2.fontFamily,
                  fontSize: typography.h2.fontSize,
                  lineHeight: typography.h2.lineHeight,
                  fontWeight: typography.h2.fontWeight,
                  color: colors.text,
                  flex: 1,
                }}
                accessibilityRole="header"
              >
                {session.title}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isActive
                      ? colors.success
                      : colors.disabled,
                    borderRadius: radius.sm,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {isActive ? "● LIVE" : "ENDED"}
                </Text>
              </View>
            </View>

            {session.description ? (
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.textSecondary,
                  marginTop: 4,
                }}
              >
                {session.description}
              </Text>
            ) : null}

            <View style={[styles.bannerMetaRow, { marginTop: spacing.md }]}>
              <View>
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: 10,
                    color: colors.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Code
                </Text>
                <Text
                  style={{
                    fontFamily: typography.title.fontFamily,
                    color: colors.primary,
                    fontSize: 20,
                    fontWeight: "700",
                    letterSpacing: 1,
                  }}
                >
                  {session.code}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: 10,
                    color: colors.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Created
                </Text>
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.text,
                  }}
                >
                  {new Date(session.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Go Live / Join entry point */}
          {isActive && (
            <TouchableOpacity
              style={[
                styles.liveEntryButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                },
              ]}
              onPress={enterLive}
              accessibilityRole="button"
              accessibilityLabel={
                isTeacher
                  ? "Go Live. Open live captioning"
                  : "Join Session. View live captions"
              }
            >
              <Ionicons name="mic-outline" size={20} color="#FFFFFF" />
              <Text
                style={{
                  fontFamily: typography.button.fontFamily,
                  fontSize: typography.button.fontSize,
                  fontWeight: typography.button.fontWeight,
                  color: "#FFFFFF",
                  marginLeft: spacing.sm,
                }}
              >
                {isTeacher ? "Go Live" : "Join Session"}
              </Text>
            </TouchableOpacity>
          )}

          {!isActive && (
            <View
              style={[
                styles.endedNotice,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                }}
              >
                This classroom session has ended. Captions are no longer live.
              </Text>
            </View>
          )}

          {/* Tabs */}
          <View
            style={[
              styles.tabBar,
              { borderColor: colors.border, marginBottom: spacing.md },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabButton,
                tab === "people" && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setTab("people")}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === "people" }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  fontWeight: "700",
                  color:
                    tab === "people" ? colors.primary : colors.textSecondary,
                }}
              >
                People ({session.participants.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                tab === "announcements" && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setTab("announcements")}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === "announcements" }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  fontWeight: "700",
                  color:
                    tab === "announcements"
                      ? colors.primary
                      : colors.textSecondary,
                }}
              >
                Announcements
              </Text>
            </TouchableOpacity>
          </View>

          {/* People tab */}
          {tab === "people" && (
            <View>
              {session.participants.length === 0 ? (
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    color: colors.textSecondary,
                  }}
                >
                  No students have joined this classroom yet.
                </Text>
              ) : (
                session.participants.map((p) => (
                  <View
                    key={p.id}
                    style={[
                      styles.participantItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                        fontWeight: "600",
                        color: colors.text,
                      }}
                    >
                      {p.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: typography.caption.fontSize,
                        color: colors.textSecondary,
                      }}
                    >
                      Joined {new Date(p.joined_at).toLocaleTimeString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Announcements tab */}
          {tab === "announcements" && (
            <View>
              {isTeacher && (
                <View
                  style={[
                    styles.composeBox,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      marginBottom: spacing.lg,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.secondaryBackground,
                        borderColor: colors.border,
                        borderRadius: radius.sm,
                        padding: spacing.sm,
                        marginBottom: spacing.sm,
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                        color: colors.text,
                      },
                    ]}
                    value={annTitle}
                    onChangeText={setAnnTitle}
                    placeholder="Announcement title"
                    placeholderTextColor={colors.placeholder}
                    maxLength={TITLE_MAX}
                    accessibilityLabel="Announcement title"
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.bodyInput,
                      {
                        backgroundColor: colors.secondaryBackground,
                        borderColor: colors.border,
                        borderRadius: radius.sm,
                        padding: spacing.sm,
                        marginBottom: spacing.sm,
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                        color: colors.text,
                      },
                    ]}
                    value={annBody}
                    onChangeText={setAnnBody}
                    placeholder="Write your announcement to this classroom..."
                    placeholderTextColor={colors.placeholder}
                    multiline
                    maxLength={BODY_MAX}
                    textAlignVertical="top"
                    accessibilityLabel="Announcement message"
                  />
                  <TouchableOpacity
                    onPress={handlePostAnnouncement}
                    disabled={posting}
                    accessibilityRole="button"
                    accessibilityLabel="Post announcement to this classroom"
                    accessibilityState={{ disabled: posting }}
                    style={[
                      styles.postButton,
                      {
                        backgroundColor: colors.primary,
                        borderRadius: radius.sm,
                        paddingVertical: spacing.sm,
                        opacity: posting ? 0.6 : 1,
                      },
                    ]}
                  >
                    {posting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontWeight: "700",
                          color: "#FFFFFF",
                        }}
                      >
                        Post to Classroom
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {announcementsLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : announcements.length === 0 ? (
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    color: colors.textSecondary,
                  }}
                >
                  No announcements posted to this classroom yet.
                </Text>
              ) : (
                announcements.map((a) => (
                  <View
                    key={a.id}
                    style={[
                      styles.announcementCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                        fontWeight: "700",
                        color: colors.text,
                      }}
                    >
                      {a.title}
                    </Text>
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: 11,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {new Date(a.createdAt).toLocaleString()}
                    </Text>
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                        color: colors.text,
                        marginTop: 6,
                      }}
                    >
                      {a.body}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {isTeacher && isActive && (
            <TouchableOpacity
              style={[
                styles.endButton,
                {
                  backgroundColor: "#e94560",
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginTop: spacing.xl,
                },
              ]}
              onPress={handleEndSession}
              disabled={ending}
              accessibilityRole="button"
              accessibilityLabel="End Session"
            >
              {ending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.endButtonText}>End Session</Text>
              )}
            </TouchableOpacity>
          )}

          {!isTeacher && isActive && (
            <TouchableOpacity
              style={[
                styles.leaveButton,
                {
                  backgroundColor: colors.disabled,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginTop: spacing.xl,
                },
              ]}
              onPress={handleLeaveSession}
              accessibilityRole="button"
              accessibilityLabel="Leave Classroom"
            >
              <Text style={styles.leaveButtonText}>Leave Classroom</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  banner: { borderWidth: 1 },
  bannerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bannerMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: "#FFFFFF", fontSize: 11, fontWeight: "bold" },
  liveEntryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  endedNotice: { borderWidth: 1 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginRight: 20,
  },
  participantItem: { borderWidth: 1 },
  composeBox: { borderWidth: 1 },
  input: { borderWidth: 1 },
  bodyInput: { minHeight: 90 },
  postButton: { alignItems: "center" },
  announcementCard: { borderWidth: 1 },
  endButton: { alignItems: "center" },
  endButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  leaveButton: { alignItems: "center" },
  leaveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
