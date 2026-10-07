// app/index.tsx
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../context/ThemeContext";

export default function StartScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const useNative = Platform.OS !== "web";

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;

      if (reduceMotion) {
        logoOpacity.setValue(1);
        logoScale.setValue(1);
        contentOpacity.setValue(1);
        return;
      }

      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: useNative,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 6,
            useNativeDriver: useNative,
          }),
        ]),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: useNative,
        }),
      ]).start();
    });

    return () => {
      cancelled = true;
    };
  }, [logoOpacity, logoScale, contentOpacity]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.content, { paddingHorizontal: spacing.lg }]}>
        <Animated.View
          style={[
            styles.logoPlaceholder,
            {
              borderRadius: radius.round,
              borderColor: colors.primary,
              marginBottom: spacing.xl,
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Text
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: typography.title.fontSize,
              fontWeight: "700",
              color: colors.primary,
            }}
          >
            IncluEd
          </Text>
        </Animated.View>

        <Animated.View
          style={{ opacity: contentOpacity, alignItems: "center" }}
        >
          <Text
            style={{
              fontFamily: typography.h1.fontFamily,
              fontSize: typography.h1.fontSize,
              lineHeight: typography.h1.lineHeight,
              fontWeight: typography.h1.fontWeight,
              color: colors.primary,
              textAlign: "center",
            }}
            accessibilityRole="header"
          >
            Welcome to IncluEd
          </Text>

          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              lineHeight: typography.body.lineHeight,
              color: colors.textSecondary,
              textAlign: "center",
              marginTop: spacing.md,
              paddingHorizontal: spacing.sm,
            }}
          >
            An Inclusive Education Support System that empowers accessible
            learning and communication for every BatStateU student.
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.bottomContainer,
          { paddingHorizontal: spacing.lg, opacity: contentOpacity },
        ]}
      >
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: "/login", params: { role: "student" } })
          }
          accessibilityRole="button"
          accessibilityLabel="I already have an account. Log in"
          style={{
            minHeight: 48,
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: colors.primary,
              fontFamily: typography.button.fontFamily,
              fontSize: typography.body.fontSize,
            }}
          >
            I already have an account · Log in
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: spacing.lg,
          }}
        >
          Batangas State University • ARASOF–Nasugbu
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 40,
  },
  content: {
    alignItems: "center",
    marginTop: 40,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomContainer: {
    alignItems: "center",
  },
});