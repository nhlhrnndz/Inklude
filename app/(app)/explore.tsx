import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../context/ThemeContext";

const FAKE_CAPTIONS = [
  "Good morning class, let's get started.",
  "Today we will discuss inclusive education.",
  "Please open your books to page 42.",
  "Can everyone hear me clearly?",
  "Let's take a short break.",
  "Now, who can answer this question?",
  "Very good! That is correct.",
  "Let's move on to the next topic.",
  "Please take note of this.",
  "That's all for today. Thank you!",
];

export default function LiveCaption() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  const [captions, setCaptions] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let index = 0;

    const interval = setInterval(() => {
      if (index < FAKE_CAPTIONS.length) {
        setCaptions((prev) => [...prev, FAKE_CAPTIONS[index]]);
        index++;
        scrollRef.current?.scrollToEnd({ animated: true });
      } else {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleBack = () => {
    router.replace("/student");
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            padding: spacing.lg,
          },
        ]}
      >
        {/* Back Navigation */}
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              marginBottom: spacing.lg,
            },
          ]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Student Dashboard"
          accessibilityHint="Returns to the Student Dashboard"
          hitSlop={8}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={colors.primary}
          />

          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.primary,
              marginLeft: 6,
            }}
          >
            Back
          </Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.headerRow}>
          <Ionicons
            name="mic-outline"
            size={22}
            color={colors.primary}
            style={{
              marginRight: spacing.sm,
            }}
          />

          <Text
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: typography.title.fontSize,
              fontWeight: "700",
              color: colors.text,
            }}
            accessibilityRole="header"
          >
            Live Caption
          </Text>
        </View>

        {/* Live Status */}
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            color: colors.success,
            fontSize: typography.caption.fontSize,
            marginBottom: spacing.md,
          }}
        >
          ● Live
        </Text>

        {/* Caption Area */}
        <View
          style={[
            styles.captionBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: spacing.md,
            },
          ]}
          accessibilityLiveRegion="polite"
        >
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
          >
            {captions.map((line, i) => (
              <Text
                key={i}
                style={{
                  fontFamily: typography.body.fontFamily,
                  color: colors.text,
                  fontSize: 18,
                  lineHeight: 26,
                  marginBottom: spacing.sm + 2,
                }}
              >
                {line}
              </Text>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    minHeight: 44,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  captionBox: {
    flex: 1,
    borderWidth: 1,
  },
});