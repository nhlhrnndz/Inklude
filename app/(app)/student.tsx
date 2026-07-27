import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

interface DashboardCard {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  route: "/profile" | "/join" | "/explore" | "/tts";
}

const CARDS: DashboardCard[] = [
  {
    key: "profile",
    icon: "person-circle-outline",
    title: "My Profile",
    description: "Manage your accessibility preferences",
    route: "/profile",
  },
  {
    key: "join",
    icon: "key-outline",
    title: "Join Session",
    description: "Enter class session code",
    route: "/join",
  },
  {
    key: "caption",
    icon: "chatbox-ellipses-outline",
    title: "Live Caption",
    description: "View real-time classroom subtitles",
    route: "/explore",
  },
  {
    key: "tts",
    icon: "volume-high-outline",
    title: "Text to Speech",
    description: "Speak using typed messages",
    route: "/tts",
  },
];

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: typography.h2.fontFamily,
            fontSize: typography.h2.fontSize,
            lineHeight: typography.h2.lineHeight,
            fontWeight: typography.h2.fontWeight,
            color: colors.primary,
            textAlign: "center",
          }}
          accessibilityRole="header"
        >
          IncluEd
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: 4,
            marginBottom: spacing.xl,
          }}
        >
          Welcome, {user?.name || "Student"}
        </Text>

        <View style={{ gap: spacing.md }}>
          {CARDS.map((card) => (
            <TouchableOpacity
              key={card.key}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                },
              ]}
              onPress={() => router.push(card.route)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${card.title}. ${card.description}`}
            >
              <Ionicons
                name={card.icon}
                size={28}
                color={colors.primary}
                style={{ marginBottom: spacing.sm }}
              />
              <Text
                style={{
                  fontFamily: typography.title.fontFamily,
                  fontSize: typography.title.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {card.title}
              </Text>
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginTop: 4,
                }}
              >
                {card.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  card: {
    borderWidth: 1,
  },
});