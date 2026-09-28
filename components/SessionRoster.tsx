// components/SessionRoster.tsx
//
// Horizontal scroll of avatar circles showing who's in the classroom
// session — replaces the plain "X joined" count. The current user's
// avatar is outlined so they can find themselves in the list. Tapping
// your own avatar sends a lightweight "I'm here" presence ping that
// briefly pulses your avatar for everyone else.

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

import { useTheme } from "../context/ThemeContext";
import { getSessionRoster } from "../utils/api";
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

const PRESENCE_COOLDOWN_MS = 30000;
const PULSE_DURATION_MS = 3000;

export default function SessionRoster({
  sessionId,
  currentUserId,
}: SessionRosterProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const [participants, setParticipants] = useState<RosterParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulsingIds, setPulsingIds] = useState<Set<number>>(new Set());
  const [presenceCooldown, setPresenceCooldown] = useState(false);

  const pulseTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getSessionRoster(Number(sessionId));
        if (!cancelled) {
          setParticipants(data.participants || []);
        }
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

  useEffect(() => {
    const socket = getSocket();

    function handlePresenceUpdate({ userId }: { userId: number }) {
      setPulsingIds((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });

      // Clear any existing timer for this user, then set a fresh one so
      // repeated pings don't cut the pulse short.
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

      const person = participants.find((p) => p.id === userId);
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
    // participants is read inside the handler for the toast name lookup;
    // re-subscribing on every roster change is cheap and keeps names fresh.
  }, [participants]);

  const handleImHere = () => {
    if (presenceCooldown || !currentUserId) return;

    const me = participants.find((p) => p.id === currentUserId);
    const socket = getSocket();
    socket.emit("presence-here", {
      sessionId: Number(sessionId),
      userId: currentUserId,
      initials: me?.initials || "?",
    });

    setPresenceCooldown(true);
    setTimeout(() => setPresenceCooldown(false), PRESENCE_COOLDOWN_MS);
  };

  if (loading) {
    return null; // roster is a lightweight enhancement, not worth a spinner
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
          No one else has joined yet.
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

          const avatar = (
            <View style={styles.avatarWrap}>
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

          if (!isMe) {
            return <View key={p.id}>{avatar}</View>;
          }

          return (
            <TouchableOpacity
              key={p.id}
              onPress={handleImHere}
              disabled={presenceCooldown}
              accessibilityRole="button"
              accessibilityLabel="I'm here"
              accessibilityHint="Lets classmates know you're present in this session"
              accessibilityState={{ disabled: presenceCooldown }}
              style={{ opacity: presenceCooldown ? 0.5 : 1 }}
            >
              {avatar}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    alignItems: "center",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  pulseDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
