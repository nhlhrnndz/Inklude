// components/SessionRoster.tsx
//
// Horizontal scroll of avatar circles showing who's in the session.
// Phase 4 Week 3: presence now comes from JOINING the session (the
// server announces it), so the old "I'm here" tap is retired. Names are
// role-aware from the API: classmates see display names, teachers and
// guidance see real names.
//
// Teachers/guidance also see a pause badge next to students on a break.

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getSessionRoster } from "../utils/api";
import { getSessionBreaks } from "../utils/sensoryApi";
import { getSocket } from "../utils/socket";

interface RosterParticipant {
  id: number;
  displayName: string;
  initials: string;
  avatarColor: string;
}

interface SessionRosterProps {
  sessionId: string | number;
  currentUserId?: number;
}

const PULSE_DURATION_MS = 3000;

export default function SessionRoster({
  sessionId,
  currentUserId,
}: SessionRosterProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const { user } = useAuth();

  const canSeeBreaks = user?.role === "teacher" || user?.role === "guidance";

  const [participants, setParticipants] = useState<RosterParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulsingIds, setPulsingIds] = useState<Set<number>>(new Set());
  const [onBreakIds, setOnBreakIds] = useState<Set<number>>(new Set());

  const participantsRef = useRef<RosterParticipant[]>([]);
  const pulseTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const applyRoster = (list: RosterParticipant[]) => {
    participantsRef.current = list;
    setParticipants(list);
  };

  const fetchRoster = async (): Promise<RosterParticipant[]> => {
    const data = await getSessionRoster(Number(sessionId));
    const list: RosterParticipant[] = data.participants || [];
    applyRoster(list);
    return list;
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await getSessionRoster(Number(sessionId));
        if (!cancelled) applyRoster(list.participants || []);
      } catch (err) {
        console.error("Error loading session roster:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Teacher/guidance only: who is currently on a break
  useEffect(() => {
    if (!canSeeBreaks) return;

    let cancelled = false;
    getSessionBreaks(sessionId)
      .then((ids) => {
        if (!cancelled) setOnBreakIds(new Set(ids));
      })
      .catch(() => {});

    const socket = getSocket();
    function handleBreakUpdate(payload: {
      sessionId: number;
      userId: number;
      onBreak: boolean;
    }) {
      if (Number(payload.sessionId) !== Number(sessionId)) return;
      setOnBreakIds((prev) => {
        const next = new Set(prev);
        if (payload.onBreak) next.add(payload.userId);
        else next.delete(payload.userId);
        return next;
      });
    }

    socket.on("break-update", handleBreakUpdate);
    return () => {
      cancelled = true;
      socket.off("break-update", handleBreakUpdate);
    };
  }, [sessionId, canSeeBreaks]);

  // Someone entered the session: refresh the roster if we haven't seen
  // them yet, pulse their avatar and show a short "is here" toast.
  useEffect(() => {
    const socket = getSocket();

    async function handlePresenceUpdate({ userId }: { userId: number }) {
      if (userId === currentUserId) return;

      let person = participantsRef.current.find((p) => p.id === userId);
      if (!person) {
        try {
          const list = await fetchRoster();
          person = list.find((p) => p.id === userId);
        } catch {
          // keep going with a generic name
        }
      }

      setPulsingIds((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });

      const existing = pulseTimers.current.get(userId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        setPulsingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        pulseTimers.current.delete(userId);
      }, PULSE_DURATION_MS);

      pulseTimers.current.set(userId, timer);

      Toast.show({
        type: "info",
        text1: `${person?.displayName ?? "A classmate"} is here`,
        visibilityTime: 3000,
      });
    }

    socket.on("presence-update", handlePresenceUpdate);
    return () => {
      socket.off("presence-update", handlePresenceUpdate);
      pulseTimers.current.forEach((t) => clearTimeout(t));
      pulseTimers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentUserId]);

  if (loading) {
    return null;
  }

  if (participants.length === 0) {
    return (
      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
          }}
        >
          No one has joined yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: spacing.md }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          gap: 14,
        }}
      >
        {participants.map((p) => {
          const isMe = p.id === currentUserId;
          const isPulsing = pulsingIds.has(p.id);
          const isOnBreak = canSeeBreaks && onBreakIds.has(p.id);

          return (
            <View
              key={p.id}
              style={styles.avatarWrap}
              accessibilityLabel={
                isOnBreak
                  ? `${p.displayName}, on a break`
                  : isMe
                    ? "You"
                    : p.displayName
              }
            >
              <View
                style={[
                  styles.avatarCircle,
                  {
                    backgroundColor: p.avatarColor,
                    borderRadius: radius.round,
                    borderWidth: isMe ? 3 : isPulsing ? 2 : 0,
                    borderColor: isMe ? colors.primary : "#4caf50",
                  },
                ]}
              >
                <Text style={styles.avatarInitials}>{p.initials}</Text>
              </View>

              {isPulsing && (
                <View
                  style={[
                    styles.pulseDot,
                    { backgroundColor: "#4caf50", borderRadius: radius.round },
                  ]}
                >
                  <Ionicons name="hand-right" size={9} color="#fff" />
                </View>
              )}

              {isOnBreak && (
                <View
                  style={[
                    styles.breakBadge,
                    { backgroundColor: "#6B8CA0", borderRadius: radius.round },
                  ]}
                >
                  <Ionicons name="pause" size={9} color="#fff" />
                </View>
              )}

              <Text
                numberOfLines={1}
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: 10,
                  color: colors.textSecondary,
                  marginTop: 4,
                  maxWidth: 56,
                  textAlign: "center",
                }}
              >
                {isMe ? "You" : p.displayName}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignItems: "center" },
  avatarCircle: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  pulseDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  breakBadge: {
    position: "absolute",
    top: 28,
    right: -2,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
