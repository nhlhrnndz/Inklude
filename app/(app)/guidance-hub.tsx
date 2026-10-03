// app/(app)/guidance-hub.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../context/ThemeContext";

const CARDS: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  route: string;
}[] = [
  {
    icon: "chatbubble-ellipses-outline",
    title: "Messages",
    description: "Send a private message to the Guidance Office",
    route: "/messages",
  },
  {
    icon: "calendar-outline",
    title: "Appointments",
    description: "Request a time to meet with Guidance",
    route: "/guidance/appointments",
  },
];

export default function GuidanceHubScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius, a11y } = useTheme();
  const minHeight = a11y.largerButtons ? 96 : 72;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: typography.h2.fontFamily,
            fontSize: typography.h2.fontSize,
            lineHeight: typography.h2.lineHeight,
            fontWeight: typography.h2.fontWeight,
            color: colors.text,
          }}
          accessibilityRole="header"
        >
          Guidance
        </Text>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
            marginTop: 4,
            marginBottom: spacing.lg,
          }}
        >
          How would you like to reach the Guidance Office?
        </Text>

        <View style={{ gap: spacing.md }}>
          {CARDS.map((c) => (
            <TouchableOpacity
              key={c.title}
              onPress={() => router.push(c.route as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${c.title}. ${c.description}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.lg,
                padding: spacing.md,
                minHeight,
              }}
            >
              <Ionicons
                name={c.icon}
                size={a11y.largerButtons ? 34 : 28}
                color={colors.primary}
                style={{ marginRight: spacing.md }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: typography.title.fontFamily,
                    fontSize: typography.title.fontSize,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {c.title}
                </Text>
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {c.description}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
