// components/ClassCard.tsx
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useTheme } from "../context/ThemeContext";
import type { ClassSummary } from "../utils/api";

interface Props {
  cls: ClassSummary;
  onPress: () => void;
  showAccommodations?: boolean; // teacher dashboard placeholder
}

export default function ClassCard({ cls, onPress, showAccommodations }: Props) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${cls.title}, code ${cls.code}, ${cls.memberCount} students${
        cls.isLive ? ", live now" : ""
      }`}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text
          style={{
            flex: 1,
            fontFamily: typography.title.fontFamily,
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
          }}
          numberOfLines={1}
        >
          {cls.title}
        </Text>
        {cls.isLive && (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.success, borderRadius: radius.sm },
            ]}
          >
            <Text style={styles.badgeText}>● LIVE</Text>
          </View>
        )}
      </View>

      {cls.description ? (
        <Text
          numberOfLines={1}
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {cls.description}
        </Text>
      ) : null}

      {cls.teacherName ? (
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {cls.teacherName}
        </Text>
      ) : null}

      <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
        <View style={styles.metaItem}>
          <Ionicons
            name="people-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {cls.memberCount} student{cls.memberCount === 1 ? "" : "s"}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {cls.sessionCount} session{cls.sessionCount === 1 ? "" : "s"}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: 13,
            fontWeight: "700",
            letterSpacing: 1,
            color: colors.primary,
          }}
        >
          {cls.code}
        </Text>
      </View>

      {showAccommodations && (
        <View style={[styles.metaItem, { marginTop: spacing.sm }]}>
          <Ionicons
            name="accessibility-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {cls.accommodationCount} accommodation request
            {cls.accommodationCount === 1 ? "" : "s"}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 12, marginLeft: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
});
