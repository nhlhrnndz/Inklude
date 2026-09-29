// app/(app)/student.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import WhatsActiveBanner from "../../components/WhatsActiveBanner";
import { DisabilityType, FeatureKey } from "../../constants/featureMap";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useFeatures } from "../../hooks/useFeatures";

interface DashboardCard {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  route: string | null;
  requiresAny?: FeatureKey[];
  leadsFor?: DisabilityType[];
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
    description: "Enter a class code to see live captions",
    route: "/join",
    leadsFor: ["Deaf", "Hard of Hearing"],
  },
  {
    key: "quickTalk",
    icon: "chatbubbles-outline",
    title: "Quick Talk",
    description: "Follow a nearby conversation and reply out loud",
    route: "/quick-talk",
    requiresAny: ["live_captions", "tts_output", "tts_quick_phrases"],
  },
  {
    key: "tts",
    icon: "volume-high-outline",
    title: "Text to Speech",
    description: "Speak using typed messages",
    route: "/tts",
    requiresAny: ["tts_output", "tts_quick_phrases"],
    leadsFor: ["Non-Verbal"],
  },
  {
    key: "documentReader",
    icon: "document-text-outline",
    title: "Document Reader",
    description: "Have handouts read aloud to you",
    route: "/documents",
    requiresAny: ["document_reader"],
    leadsFor: ["Blind / Low Vision"],
  },
  {
    key: "readingTools",
    icon: "book-outline",
    title: "Reading Tools",
    description: "Dyslexia-friendly reading support",
    route: null,
    requiresAny: ["dyslexia_font", "line_focus", "text_highlighting"],
    leadsFor: ["Dyslexia"],
  },
  {
    key: "focusTimer",
    icon: "timer-outline",
    title: "Focus Timer",
    description: "Work in short, focused blocks",
    route: null,
    requiresAny: ["focus_timer"],
    leadsFor: ["ADHD"],
  },
  {
    key: "voiceNav",
    icon: "mic-outline",
    title: "Voice Navigation",
    description: "Move around the app by speaking",
    route: null,
    requiresAny: ["voice_command_navigation"],
    leadsFor: ["Physical / Motor"],
  },
  {
    key: "visualSchedule",
    icon: "calendar-outline",
    title: "Visual Schedule",
    description: "See your day as clear, predictable cards",
    route: "/schedule",
    requiresAny: ["visual_schedule"],
    leadsFor: ["Autism"],
  },
];

const NO_RANK = 999;

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();
  const { hasFeature, disabilityTypes } = useFeatures();

  const showAll = disabilityTypes.length === 0;

  const visibleCards = CARDS.filter((card) => {
    if (showAll) return card.route !== null;
    if (!card.requiresAny) return true;
    return card.requiresAny.some((f) => hasFeature(f));
  });

  const rankOf = (card: DashboardCard) => {
    if (!card.leadsFor) return NO_RANK;
    const idx = disabilityTypes.findIndex((t) =>
      card.leadsFor!.includes(t as DisabilityType),
    );
    return idx === -1 ? NO_RANK : idx;
  };

  const sortedCards = [...visibleCards].sort((a, b) => rankOf(a) - rankOf(b));

  const recommended = sortedCards
    .filter((c) => rankOf(c) < NO_RANK && c.route !== null)
    .slice(0, 2);
  const recommendedKeys = new Set(recommended.map((c) => c.key));
  const otherCards = sortedCards.filter((c) => !recommendedKeys.has(c.key));

  const openCard = (card: DashboardCard) => {
    if (card.route === null) {
      Toast.show({
        type: "info",
        text1: "Coming Soon",
        text2: `${card.title} will be available in a future update.`,
      });
      return;
    }
    router.push(card.route as any);
  };

  const renderCard = (card: DashboardCard, highlighted = false) => {
    const comingSoon = card.route === null;
    return (
      <TouchableOpacity
        key={card.key}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: highlighted ? colors.primary : colors.border,
            borderWidth: highlighted ? 2 : 1,
            borderRadius: radius.lg,
            padding: spacing.lg,
            opacity: comingSoon ? 0.75 : 1,
          },
        ]}
        onPress={() => openCard(card)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${card.title}. ${card.description}${
          comingSoon ? ". Coming soon." : ""
        }`}
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
        {comingSoon && (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              fontWeight: "600",
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Coming soon
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
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

        <WhatsActiveBanner />

        {recommended.length > 0 && (
          <>
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
              Recommended for you
            </Text>
            <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
              {recommended.map((c) => renderCard(c, true))}
            </View>
          </>
        )}

        {otherCards.length > 0 && (
          <>
            {recommended.length > 0 && (
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
                More tools
              </Text>
            )}
            <View style={{ gap: spacing.md }}>
              {otherCards.map((c) => renderCard(c))}
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
  },
  card: {},
});
