// components/BreakButton.tsx
//
// "I need a break" — one tap, no confirmation, no questions. The student
// stays in the session; the teacher sees a small icon on their avatar and
// gets a quiet notification.

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

import { useTheme } from "../context/ThemeContext";
import { getMyBreak, setMyBreak } from "../utils/sensoryApi";

export default function BreakButton({
  sessionId,
}: {
  sessionId: string | number;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  const [onBreak, setOnBreak] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyBreak(sessionId)
      .then((data) => {
        if (!cancelled) setOnBreak(data.onBreak);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const toggle = async () => {
    if (busy) return;
    const next = !onBreak;
    setBusy(true);
    setOnBreak(next); // instant feedback
    try {
      await setMyBreak(sessionId, next);
    } catch {
      setOnBreak(!next);
      Toast.show({
        type: "error",
        text1: "Could not send",
        text2: "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        marginHorizontal: spacing.lg,
        marginTop: spacing.sm,
      }}
    >
      <TouchableOpacity
        onPress={toggle}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={onBreak ? "I'm back" : "I need a break"}
        accessibilityHint={
          onBreak
            ? "Lets your teacher know you are ready again"
            : "Quietly lets your teacher know you need a break. You stay in the session."
        }
        style={[
          styles.button,
          {
            backgroundColor: onBreak ? colors.surface : colors.primary,
            borderColor: colors.primary,
            borderWidth: onBreak ? 2 : 0,
            borderRadius: radius.md,
            paddingVertical: spacing.md,
            minHeight: 64,
            opacity: busy ? 0.7 : 1,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={onBreak ? colors.primary : "#FFFFFF"} />
        ) : (
          <>
            <Ionicons
              name={onBreak ? "arrow-undo-outline" : "pause-circle-outline"}
              size={24}
              color={onBreak ? colors.primary : "#FFFFFF"}
            />
            <Text
              style={{
                fontFamily: typography.button.fontFamily,
                fontSize: 17,
                fontWeight: "700",
                color: onBreak ? colors.primary : "#FFFFFF",
                marginLeft: spacing.sm,
              }}
            >
              {onBreak ? "I'm back" : "I need a break"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {onBreak && (
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: spacing.sm,
          }}
          accessibilityLiveRegion="polite"
        >
          Your teacher knows. You're still in the session. Tap "I'm back" when
          you're ready.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
