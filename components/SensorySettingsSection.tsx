// components/SensorySettingsSection.tsx
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import Toast from "react-native-toast-message";

import { useTheme } from "../context/ThemeContext";
import { getSensorySettings, updateSensorySettings } from "../utils/sensoryApi";

export default function SensorySettingsSection() {
  const { colors, typography, spacing, radius, sensoryMode, setSensoryMode } =
    useTheme();

  const [reminders, setReminders] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSensorySettings()
      .then((data) => {
        if (!cancelled) setReminders(data.whatsNextReminders);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSensory = async (value: boolean) => {
    setSensoryMode(value); // instant
    try {
      await updateSensorySettings({ sensoryMode: value });
    } catch {
      setSensoryMode(!value);
      Toast.show({
        type: "error",
        text1: "Could not save",
        text2: "Please try again.",
      });
    }
  };

  const toggleReminders = async (value: boolean) => {
    setReminders(value);
    try {
      await updateSensorySettings({ whatsNextReminders: value });
    } catch {
      setReminders(!value);
      Toast.show({
        type: "error",
        text1: "Could not save",
        text2: "Please try again.",
      });
    }
  };

  const row = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    description: string,
    value: boolean,
    onChange: (v: boolean) => void,
  ) => (
    <View style={styles.row}>
      <Ionicons
        name={icon}
        size={22}
        color={colors.primary}
        style={{ marginRight: spacing.sm }}
      />
      <View style={{ flex: 1, paddingRight: spacing.sm }}>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "600",
            color: colors.text,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.disabled, true: colors.primary }}
        thumbColor="#FFFFFF"
        accessibilityLabel={title}
      />
    </View>
  );

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text
        style={{
          fontFamily: typography.title.fontFamily,
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
          marginBottom: spacing.sm,
        }}
        accessibilityRole="header"
      >
        Comfort
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {row(
          "leaf-outline",
          "Sensory-friendly mode",
          "Muted colors, roomier spacing, no motion, and gentle vibration instead of sound.",
          sensoryMode,
          toggleSensory,
        )}
        <View style={{ height: 1, backgroundColor: colors.divider }} />
        {row(
          "alarm-outline",
          "What's Next reminders",
          "A quiet heads-up 5 minutes before each class on your schedule.",
          reminders,
          toggleReminders,
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    minHeight: 64,
  },
});
