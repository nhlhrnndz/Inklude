//app/session/[id]/index.tsx
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

import ClassPulse from "../../../components/ClassPulse";
import SessionDocuments from "../../../components/SessionDocuments";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { studentWantsLiveCaptions } from "../../../hooks/useWantsLiveCaptions";
import { getMyAccessibility } from "../../../utils/accessibilityApi";
import {
  endSession,
  enterSession,
  getSessionAnnouncements,
  getSessionDetails,
  postAnnouncement,
} from "../../../utils/api";
import { crossAlert } from "../../../utils/crossAlert";
import { getSocket } from "../../../utils/socket";

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
  isLive: boolean;
  liveEndedAt: string | null;
  currentLiveRunId: number | null;
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

type Tab = "people" | "announcements" | "documents";

export default function ClassroomDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const isTeacher = user?.role === "teacher";

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [disabling, setDisabling] = useState(false);
  const [tab, setTab] = useState<Tab>("people");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [posting, setPosting] = useState(false);

  // Does this student use live captions? null = still loading.
  // This screen is outside AccessibilityProvider, so it loads the answer
  // itself. Teachers always see the Go Live button, so they skip this.
  const [wantsCaptions, setWantsCaptions] = useState<boolean | null>(null);

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

  // Work out whether to offer the live captions "Join Session" button.
  useEffect(() => {
    if (!user?.id || isTeacher) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await getMyAccessibility();
        if (!cancelled) {
          setWantsCaptions(
            studentWantsLiveCaptions(data.needs, data.preferences),
          );
        }
      } catch {
        // If we can't tell, show the button rather than lock out a student
        // who needs captions.
        if (!cancelled) setWantsCaptions(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, isTeacher]);

  // Join the session's socket room just to hear live/disable updates while
  // sitting on this screen, so the banner status and the pulse card react
  // right away instead of only refreshing the next time this screen opens.
  useEffect(() => {
    if (!id || !user?.id) return;
    const socket = getSocket();

    const join = () => {
      socket.emit("join-session", {
        sessionId: id,
        userId: user.id,
        role: isTeacher ? "teacher" : "student",
      });
    };

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("live-ended", loadSession);
    socket.on("live-started", loadSession);
    socket.on("session-ended", loadSession);

    return () => {
      socket.emit("leave-session", { sessionId: id });
      socket.off("connect", join);
      socket.off("live-ended", loadSession);
      socket.off("live-started", loadSession);
      socket.off("session-ended", loadSession);
    };
  }, [id, user?.id, isTeacher, loadSession]);

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

  const enterLive = async () => {
    if (!isTeacher) {
      try {
        await enterSession(Number(id));
      } catch (error: any) {
        crossAlert(
          "Can't join",
          error.response?.data?.message || "Could not join this session.",
        );
        return;
      }
    }
    router.push(`/session/${id}/live` as any);
  };

  const handleDisableClassroom = () => {
    crossAlert(
      "Disable this classroom?",
      "This permanently closes the classroom. Students won't be able to join, and you won't be able to go live here again — you'll need to create a new classroom next time.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: confirmDisableClassroom,
        },
      ],
    );
  };

  const confirmDisableClassroom = async () => {
    setDisabling(true);
    try {
      await endSession(Number(id));
      crossAlert("Classroom disabled", "This classroom is now closed.", [
        { text: "OK", onPress: goToDashboard },
      ]);
    } catch (error) {
      console.error("Error disabling classroom:", error);
      crossAlert("Error", "Failed to disable the classroom");
    } finally {
      setDisabling(false);
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

  const isEnabled = session.status === "active";
  const hasHadALiveRun = !!session.liveEndedAt;

  // Teachers always get Go Live. Students get Join Session only if they use
  // live captions (and only once we know, so it never flashes).
  const showLiveEntry = isEnabled && (isTeacher || wantsCaptions === true);

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
                    backgroundColor: isEnabled
                      ? session.isLive
                        ? colors.success
                        : colors.primary
                      : colors.disabled,
                    borderRadius: radius.sm,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {!isEnabled ? "DISABLED" : session.isLive ? "● LIVE" : "OPEN"}
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

          {/* Go Live (teacher) / Join Session (students who use live captions) */}
          {showLiveEntry && (
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

          {!isEnabled && (
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
                This classroom has been disabled. It can no longer be joined or
                used for live captioning.
              </Text>
            </View>
          )}

          {isTeacher && hasHadALiveRun && (
            <TouchableOpacity
              style={[
                styles.liveEntryButton,
                {
                  backgroundColor: colors.secondaryBackground,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                },
              ]}
              onPress={() => router.push(`/session/${id}/summary` as any)}
              accessibilityRole="button"
              accessibilityLabel="View session summary"
            >
              <Ionicons
                name="stats-chart-outline"
                size={20}
                color={colors.primary}
              />
              <Text
                style={{
                  fontFamily: typography.button.fontFamily,
                  fontSize: typography.button.fontSize,
                  fontWeight: typography.button.fontWeight,
                  color: colors.primary,
                  marginLeft: spacing.sm,
                }}
              >
                View Session Summary
              </Text>
            </TouchableOpacity>
          )}

          {/* Class pulse — keyed by currentLiveRunId so a new live run
              forces a fresh mount (fresh question) instead of keeping the
              previous run's "thanks" state. Hidden while currently live,
              since the pulse only makes sense once a run has ended. */}
          {!isTeacher && hasHadALiveRun && !session.isLive && (
            <View style={{ marginBottom: spacing.lg }}>
              <ClassPulse
                key={`pulse-${session.currentLiveRunId ?? "none"}`}
                sessionId={id}
              />
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

            <TouchableOpacity
              style={[
                styles.tabButton,
                tab === "documents" && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setTab("documents")}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === "documents" }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  fontWeight: "700",
                  color:
                    tab === "documents" ? colors.primary : colors.textSecondary,
                }}
              >
                Documents
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

          {/* Documents tab */}
          {tab === "documents" && (
            <SessionDocuments sessionId={Number(id)} isTeacher={isTeacher} />
          )}

          {isTeacher && isEnabled && (
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
              onPress={handleDisableClassroom}
              disabled={disabling}
              accessibilityRole="button"
              accessibilityLabel="Disable Classroom"
            >
              {disabling ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.endButtonText}>Disable Classroom</Text>
              )}
            </TouchableOpacity>
          )}

          {!isTeacher && isEnabled && (
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
