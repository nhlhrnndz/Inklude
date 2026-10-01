// app/session/[id]/live.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import AskTeacherPanel from "../../../components/AskTeacherPanel";
import BreakButton from "../../../components/BreakButton";
import ClassPulse from "../../../components/ClassPulse";
import SessionRoster from "../../../components/SessionRoster";
import TeacherSignalToast from "../../../components/TeacherSignalToast";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { useCaptionSession } from "../../../hooks/useCaptionSession";
import {
  useSendSignal,
  useTeacherSignals,
} from "../../../hooks/useClassroomSignals";
import { useFeatures } from "../../../hooks/useFeatures";
import { useMicCaptioning } from "../../../hooks/useMicCaptioning";
import { downloadSessionReport, getSessionDetails } from "../../../utils/api";
import { crossAlert } from "../../../utils/crossAlert";
import { endLiveSession, goLiveSession } from "../../../utils/liveApi";
import { getSocket } from "../../../utils/socket";

interface Session {
  id: number;
  code: string;
  title: string;
  status: "active" | "ended";
  isLive: boolean;
  participants: { id: number }[];
}

// Speaks a short prompt only if the student has opted into voice
// navigation prompts. Failures (e.g. TTS unavailable) are swallowed —
// this is a nice-to-have, never something that should crash the screen.
function speakPrompt(enabled: boolean, text: string) {
  if (!enabled) return;
  try {
    Speech.speak(text);
  } catch (err) {
    console.warn("voice navigation prompt failed:", err);
  }
}

export default function LiveCaptioningScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();
  const { hasFeature } = useFeatures();

  const isTeacher = user?.role === "teacher";

  // Phase 2.3 Week 4 — Profile-Driven Adaptive UI
  const wantsLargeText = hasFeature("large_text");
  const wantsHighContrast = hasFeature("high_contrast");
  const wantsLargeTouchTargets = hasFeature("large_touch_targets");
  const wantsVoicePrompts = hasFeature("voice_navigation_prompts");

  // Phase 4 Week 4 — students who communicate by typing (Non-Verbal) get a
  // quiet "Ask teacher" panel; the teacher sees their requests as a small
  // toast and answers out loud.
  const canAskTeacher = !isTeacher && hasFeature("quick_reply");
  const studentFirstName =
    (user?.name || "").trim().split(" ")[0] || "A student";

  const captionFontSize = wantsLargeText ? 30 : 22;
  const captionLineHeight = wantsLargeText ? 40 : 30;
  const buttonPaddingVertical = wantsLargeTouchTargets
    ? spacing.lg
    : spacing.md;
  const buttonMinHeight = wantsLargeTouchTargets ? 64 : undefined;
  const buttonFontSize = wantsLargeTouchTargets ? 17 : 14;

  const captionAreaBg = wantsHighContrast ? "#000000" : colors.background;
  const captionTextColor = wantsHighContrast ? "#FFFFFF" : colors.text;
  const captionPlaceholderColor = wantsHighContrast
    ? "#CCCCCC"
    : colors.textSecondary;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewboardConnected, setViewboardConnected] = useState(false);
  const [endingLive, setEndingLive] = useState(false);
  const [resumingLive, setResumingLive] = useState(false);
  const [startingLive, setStartingLive] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Whether a live run is currently open on the server for this classroom.
  // A ref mirrors the state so button handlers always read the latest value.
  const [isLive, setIsLive] = useState(false);
  const isLiveRef = useRef(false);
  const updateIsLive = (value: boolean) => {
    isLiveRef.current = value;
    setIsLive(value);
  };

  // Track sessionEnded transitions so the "Class ended" voice prompt
  // only fires once, right when it happens — not on every re-render.
  const prevSessionEnded = useRef(false);

  const { captions, connected, sessionEnded, classroomDisabled, sendCaption } =
    useCaptionSession(id, user?.id, isTeacher ? "teacher" : "student");

  // Teacher: incoming quiet requests. Student: sender.
  const { signals, dismissAll } = useTeacherSignals(isTeacher);
  const { send: sendSignal } = useSendSignal();

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
        updateIsLive(!!data.session?.isLive);
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

  // Voice prompt when the session transitions into "ended"
  useEffect(() => {
    if (sessionEnded && !prevSessionEnded.current) {
      speakPrompt(
        wantsVoicePrompts,
        classroomDisabled
          ? "This classroom has been disabled."
          : "Class ended.",
      );
    }
    prevSessionEnded.current = sessionEnded;
  }, [sessionEnded, classroomDisabled, wantsVoicePrompts]);

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

  // Makes sure a live run exists on the server. Creates one (go-live) if
  // the classroom isn't live yet. Returns true when a live run is open.
  const ensureLive = async (): Promise<boolean> => {
    if (isLiveRef.current) return true;
    try {
      await goLiveSession(Number(id));
      updateIsLive(true);
      return true;
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Could not go live",
        text2: error.response?.data?.message ?? "Please try again.",
      });
      return false;
    }
  };

  const handleMicToggle = async () => {
    if (isRecording) {
      stopCaptioning();
      speakPrompt(wantsVoicePrompts, "Live captioning stopped.");
      return;
    }

    if (startingLive) return;
    setStartingLive(true);
    try {
      // Start a fresh live run first (if needed), then the mic.
      const ok = await ensureLive();
      if (!ok) return;
      startCaptioning();
      speakPrompt(wantsVoicePrompts, "Starting live captioning.");
    } finally {
      setStartingLive(false);
    }
  };

  const handleEndLive = () => {
    if (!isLiveRef.current) {
      Toast.show({
        type: "info",
        text1: "Not live yet",
        text2: "Tap Start Live Captioning first, then end the session.",
      });
      return;
    }

    crossAlert(
      "End Session?",
      "This stops captioning for now. Students will see the wrap-up card. You can go live again in this same classroom later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Session",
          style: "destructive",
          onPress: async () => {
            setEndingLive(true);
            try {
              if (isRecording) stopCaptioning();
              await endLiveSession(Number(id));
              updateIsLive(false);
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: "Could not end the session",
                text2: error.response?.data?.message ?? "Please try again.",
              });
            } finally {
              setEndingLive(false);
            }
          },
        },
      ],
    );
  };

  const handleResumeLive = async () => {
    setResumingLive(true);
    speakPrompt(wantsVoicePrompts, "Resuming live captioning.");
    try {
      await goLiveSession(Number(id));
      updateIsLive(true);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Could not resume",
        text2: error.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setResumingLive(false);
    }
  };

  const handleDownloadReport = async () => {
    if (downloadingReport || !session) return;
    setDownloadingReport(true);
    try {
      await downloadSessionReport(session.id, session.title);
    } catch (error) {
      console.error("Error downloading report:", error);
      crossAlert(
        "Download failed",
        "Couldn't download the session report. Please try again.",
      );
    } finally {
      setDownloadingReport(false);
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

      {/* Session Roster — hidden once captioning has fully stopped, since
          there's nothing live to show a roster for. */}
      {!sessionEnded && (
        <View style={{ marginTop: spacing.sm }}>
          <SessionRoster sessionId={id} currentUserId={user?.id} />
        </View>
      )}

      {sessionEnded ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: spacing.lg,
          }}
        >
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
              textAlign: "center",
            }}
          >
            {classroomDisabled
              ? "This classroom has been disabled"
              : "Class ended"}
          </Text>

          {classroomDisabled && (
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.textSecondary,
                marginTop: spacing.sm,
                textAlign: "center",
              }}
            >
              The teacher closed this classroom. You'll need a new class code to
              join another session.
            </Text>
          )}

          {!classroomDisabled && isTeacher && (
            <TouchableOpacity
              onPress={handleResumeLive}
              disabled={resumingLive}
              accessibilityRole="button"
              accessibilityLabel="Resume live captioning"
              style={{
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.xl,
                marginTop: spacing.lg,
                opacity: resumingLive ? 0.6 : 1,
              }}
            >
              {resumingLive ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontWeight: "700",
                    color: "#FFFFFF",
                    fontSize: typography.body.fontSize,
                  }}
                >
                  🎙 Resume Live Captioning
                </Text>
              )}
            </TouchableOpacity>
          )}

          {!classroomDisabled && isTeacher && (
            <TouchableOpacity
              onPress={() => router.push(`/session/${id}/summary` as any)}
              accessibilityRole="button"
              accessibilityLabel="View session summary"
              style={{
                marginTop: spacing.md,
                padding: spacing.sm,
              }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  color: colors.primary,
                  fontSize: typography.body.fontSize,
                  fontWeight: "600",
                }}
              >
                View Session Summary
              </Text>
            </TouchableOpacity>
          )}

          {/* Download report — available to both teacher and student */}
          <TouchableOpacity
            style={[
              styles.downloadReportButton,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: spacing.md - 2,
                paddingHorizontal: spacing.xl,
                marginTop: spacing.lg,
              },
            ]}
            onPress={handleDownloadReport}
            accessibilityRole="button"
            accessibilityLabel="Download session report"
            disabled={downloadingReport}
          >
            {downloadingReport ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.downloadReportButtonText}>
                  Download Session Report
                </Text>
              </>
            )}
          </TouchableOpacity>

          {!isTeacher && !classroomDisabled && (
            <View style={{ width: "100%", marginTop: spacing.lg }}>
              <ClassPulse sessionId={id} />
            </View>
          )}

          <TouchableOpacity
            onPress={goBackToClassroom}
            style={{ marginTop: spacing.lg }}
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
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {isTeacher && (
            <View
              style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}
            >
              <TouchableOpacity
                style={[
                  styles.micButton,
                  {
                    backgroundColor: isRecording ? "#e94560" : colors.primary,
                    borderRadius: radius.md,
                    padding: buttonPaddingVertical,
                    minHeight: buttonMinHeight,
                    opacity: startingLive ? 0.6 : 1,
                  },
                ]}
                onPress={handleMicToggle}
                disabled={startingLive}
                accessibilityRole="button"
                accessibilityLabel={
                  isRecording ? "Stop Live Captioning" : "Start Live Captioning"
                }
              >
                {startingLive ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.micButtonText,
                      { fontSize: wantsLargeTouchTargets ? 17 : 14 },
                    ]}
                  >
                    {isRecording
                      ? "⏹ Stop Live Captioning"
                      : "🎙 Start Live Captioning"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.endSessionButton,
                  {
                    borderColor: "#e94560",
                    borderRadius: radius.md,
                    padding: wantsLargeTouchTargets ? spacing.md : spacing.sm,
                    minHeight: wantsLargeTouchTargets ? 56 : undefined,
                    marginTop: spacing.sm,
                  },
                ]}
                onPress={handleEndLive}
                disabled={endingLive}
                accessibilityRole="button"
                accessibilityLabel="End Session"
              >
                {endingLive ? (
                  <ActivityIndicator color="#e94560" />
                ) : (
                  <Text
                    style={{
                      color: "#e94560",
                      fontWeight: "700",
                      fontSize: buttonFontSize,
                    }}
                  >
                    ⏹ End Session
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.viewboardButton,
                  {
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    padding: wantsLargeTouchTargets ? spacing.md : spacing.sm,
                    minHeight: wantsLargeTouchTargets ? 56 : undefined,
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
                    fontSize: buttonFontSize,
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

          {!isTeacher && hasFeature("visual_schedule") && (
            <BreakButton sessionId={id} />
          )}

          {/* Captions — the dominant element on this screen.
              Size/contrast adapt to large_text / high_contrast preferences. */}
          <ScrollView
            style={[styles.captionScroll, { backgroundColor: captionAreaBg }]}
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
                  color: captionPlaceholderColor,
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
                    fontSize: captionFontSize,
                    lineHeight: captionLineHeight,
                    color: captionTextColor,
                    marginBottom: spacing.md,
                  }}
                >
                  {c.text}
                </Text>
              ))
            )}
          </ScrollView>

          {/* Student: quiet "Ask teacher" panel (collapsed by default) */}
          {canAskTeacher && (
            <AskTeacherPanel
              disabled={!connected}
              onSend={(text) => sendSignal(text, studentFirstName)}
            />
          )}

          {/* Teacher: small, silent toast for student requests. Sent only to
              the teacher's own socket, so it never shows on the Viewboard. */}
          {isTeacher && (
            <TeacherSignalToast signals={signals} onSeen={dismissAll} />
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
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
  micButton: { alignItems: "center", justifyContent: "center" },
  micButtonText: { color: "#fff", fontWeight: "bold" },
  endSessionButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  viewboardButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  captionScroll: { flex: 1 },
  downloadReportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  downloadReportButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
});
