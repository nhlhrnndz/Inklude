// app/(app)/student.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import WhatsActiveBanner from "../../components/WhatsActiveBanner";
import { useAccessibility } from "../../context/AccessibilityContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

type CardKey =
  | "classroom"
  | "quickTalk"
  | "tts"
  | "calendar"
  | "guidance"
  | "preferences"
  | "profile";

interface DashboardCard {
  key: CardKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  route: string;
}

const CARD_DEFS: Record<CardKey, DashboardCard> = {
  classroom: {
    key: "classroom",
    icon: "school-outline",
    title: "Classroom",
    description: "Join a class with its code and follow live captions",
    route: "/join",
  },
  quickTalk: {
    key: "quickTalk",
    icon: "chatbubbles-outline",
    title: "Quick Talk",
    description: "Follow a nearby conversation and reply out loud",
    route: "/quick-talk",
  },
  tts: {
    key: "tts",
    icon: "volume-high-outline",
    title: "Text to Speech",
    description: "Speak using typed messages",
    route: "/tts",
  },
  calendar: {
    key: "calendar",
    icon: "calendar-outline",
    title: "My Schedule",
    description: "See your classes and what is next",
    route: "/schedule",
  },
  guidance: {
    key: "guidance",
    icon: "heart-outline",
    title: "Guidance",
    description: "Message the Guidance Office",
    route: "/messages",
  },
  preferences: {
    key: "preferences",
    icon: "options-outline",
    title: "Accessibility Preferences",
    description: "Change text size, contrast, captions and more",
    route: "/accessibility",
  },
  profile: {
    key: "profile",
    icon: "person-circle-outline",
    title: "My Profile",
    description: "Your account and information",
    route: "/profile",
  },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius, a11y } = useTheme();
  const { needs, preferences, displayUsername } = useAccessibility();

  const [showMore, setShowMore] = useState(false);

  const needsHearing =
    needs.includes("Deaf") || needs.includes("Hard of Hearing");
  const nonVerbal = needs.includes("Non-Verbal");
  const wantsCaptions = needsHearing || !!preferences.live_captions;
  const wantsTTS = !!preferences.text_to_speech || nonVerbal;
  const needsVisualHelp =
    needs.includes("Low Vision") || needs.includes("Color Blindness");

  // Which tools are available to this student at all.
  const available: CardKey[] = ["classroom"];
  if (wantsCaptions || nonVerbal || wantsTTS) available.push("quickTalk");
  if (wantsTTS) available.push("tts");
  available.push("calendar", "guidance", "preferences", "profile");

  // Recommended (max 2), driven by needs and enabled preferences.
  const recommendedKeys: CardKey[] = [];
  if (wantsCaptions) recommendedKeys.push("classroom");
  if (wantsCaptions || nonVerbal) recommendedKeys.push("quickTalk");
  // Deaf + Non-Verbal already gets Classroom + Quick Talk; TTS is optional.
  if (wantsTTS && !(needsHearing && nonVerbal)) recommendedKeys.push("tts");
  if (needsVisualHelp) recommendedKeys.push("preferences");
  if (recommendedKeys.length === 0) recommendedKeys.push("classroom");

  const recommended = recommendedKeys
    .filter((k, i) => recommendedKeys.indexOf(k) === i && available.includes(k))
    .slice(0, 2)
    .map((k) => CARD_DEFS[k]);

  const recommendedSet = new Set(recommended.map((c) => c.key));
  const moreTools = available
    .filter((k) => !recommendedSet.has(k))
    .map((k) => CARD_DEFS[k]);

  const firstName = (user?.name || "").trim().split(" ")[0];
  const greetingName = displayUsername || firstName || "Student";

  const cardMinHeight = a11y.largerButtons ? 96 : 72;

  const renderCard = (card: DashboardCard, highlighted = false) => (
    <TouchableOpacity
      key={card.key}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: highlighted ? colors.primary : colors.border,
          borderWidth: highlighted ? 2 : 1,
          borderRadius: radius.lg,
          padding: spacing.md,
          minHeight: cardMinHeight,
        },
      ]}
      onPress={() => router.push(card.route as any)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${card.title}. ${card.description}`}
    >
      <Ionicons
        name={card.icon}
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
          {card.title}
        </Text>
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {card.description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const sectionTitle = (text: string) => (
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
      {text}
    </Text>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
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
          {getGreeting()}, {greetingName}
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
          Here is what you can do today.
        </Text>

        {/* What's active (shows once, during onboarding) */}
        <WhatsActiveBanner />

        {/* Today */}
        {sectionTitle("Today")}
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: spacing.md,
              minHeight: cardMinHeight,
              marginBottom: spacing.xl,
            },
          ]}
          onPress={() => router.push("/schedule" as any)}
          accessibilityRole="button"
          accessibilityLabel="Today's schedule. Open your schedule to see today's classes."
        >
          <Ionicons
            name="time-outline"
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
              Today's schedule
            </Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              Open your schedule to see today's classes.
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Recommended */}
        {recommended.length > 0 && (
          <>
            {sectionTitle("Recommended for you")}
            <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
              {recommended.map((c) => renderCard(c, true))}
            </View>
          </>
        )}

        {/* More tools (collapsed when reduced clutter is on) */}
        {moreTools.length > 0 && (
          <>
            {sectionTitle("More tools")}
            {a11y.reducedClutter && !showMore ? (
              <TouchableOpacity
                onPress={() => setShowMore(true)}
                accessibilityRole="button"
                accessibilityLabel="Show more tools"
                style={[
                  styles.card,
                  {
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                    minHeight: cardMinHeight,
                    marginBottom: spacing.xl,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text
                  style={{
                    flex: 1,
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    fontWeight: "600",
                    color: colors.primary,
                  }}
                >
                  Show more tools ({moreTools.length})
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            ) : (
              <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
                {moreTools.map((c) => renderCard(c))}
              </View>
            )}
          </>
        )}

        {/* Upcoming (hidden when reduced clutter is on) */}
        {!a11y.reducedClutter && (
          <>
            {sectionTitle("Upcoming")}
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                backgroundColor: colors.surface,
                padding: spacing.md,
              }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.textSecondary,
                }}
              >
                Assignments, Guidance appointments and campus events will show
                up here soon.
              </Text>
            </View>
          </>
        )}
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
    paddingBottom: 48,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
  },
});
