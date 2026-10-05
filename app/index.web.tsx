// app/index.web.tsx — public landing page (website only)
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../context/ThemeContext";

const APK_URL = "/downloads/IncluEd.apk";

const FEATURES = [
  {
    title: "Adapts to you",
    text: "Choose the support you need. IncluEd suggests accessibility settings, and you can change them anytime.",
  },
  {
    title: "Live captions",
    text: "Captions and transcripts during class sessions.",
  },
  {
    title: "Quick Talk",
    text: "Type your message and talk with your teacher in class.",
  },
  {
    title: "Accommodation requests",
    text: "Ask teachers for support without sharing your disability type.",
  },
  {
    title: "Guidance support",
    text: "Message Guidance and book appointments.",
  },
  {
    title: "Campus access",
    text: "Accessible events, an accessibility map, and a way to report barriers.",
  },
];

const STEPS = [
  "Students download the IncluEd app and pick their support needs.",
  "The app adapts to their accessibility preferences.",
  "Students join classes, communicate, and ask for support.",
  "Teachers and Guidance respond through the Staff Portal.",
];

export default function LandingPage() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  const openStaffPortal = () => router.push("/staff-login" as any);
  const downloadApk = () => {
    window.location.href = APK_URL;
  };

  // Optional shortcut: Ctrl + K (Cmd + K on Mac) opens the Staff Portal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/staff-login" as any);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const Button = ({
    label,
    onPress,
    filled,
  }: {
    label: string;
    onPress: () => void;
    filled?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        backgroundColor: filled ? colors.primary : "transparent",
        borderColor: colors.primary,
        borderWidth: 2,
        borderRadius: radius.xl,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        minHeight: 48,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: typography.button.fontFamily,
          fontSize: typography.button.fontSize,
          fontWeight: typography.button.fontWeight,
          color: filled ? "#FFFFFF" : colors.primary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  const Heading = ({ children }: { children: string }) => (
    <Text
      accessibilityRole="header"
      style={{
        fontFamily: typography.h1.fontFamily,
        fontSize: typography.h1.fontSize,
        fontWeight: typography.h1.fontWeight,
        color: colors.primary,
        marginBottom: spacing.md,
      }}
    >
      {children}
    </Text>
  );

  const Body = ({ children, muted }: { children: string; muted?: boolean }) => (
    <Text
      style={{
        fontFamily: typography.body.fontFamily,
        fontSize: typography.body.fontSize,
        lineHeight: typography.body.lineHeight,
        color: muted ? colors.textSecondary : colors.text,
      }}
    >
      {children}
    </Text>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          alignItems: "center",
          paddingVertical: spacing.xxl,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 1000,
            paddingHorizontal: spacing.lg,
            gap: spacing.xxl,
          }}
        >
          {/* Top bar */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: spacing.md,
            }}
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
            <Button label="Staff Portal" onPress={openStaffPortal} />
          </View>

          {/* Hero */}
          <View style={{ gap: spacing.md }}>
            <Heading>An inclusive education support system</Heading>
            <Body muted>
              IncluEd helps students with disabilities at Batangas State
              University ARASOF–Nasugbu take part in class and campus life, and
              stay connected with teachers and the Guidance Office.
            </Body>
            <View
              style={{
                flexDirection: "row",
                gap: spacing.md,
                flexWrap: "wrap",
                marginTop: spacing.sm,
              }}
            >
              <Button
                label="Download IncluEd App"
                onPress={downloadApk}
                filled
              />
              <Button label="Staff Portal" onPress={openStaffPortal} />
            </View>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
              }}
            >
              The student app is for Android. Your phone may ask you to allow
              installs from your browser. Staff tip: press Ctrl + K to open the
              Staff Portal.
            </Text>
          </View>

          {/* About */}
          <View>
            <Heading>About</Heading>
            <Body>
              IncluEd does not replace the university's systems. It adds an
              accessibility layer that helps students adapt, participate,
              communicate, navigate, and receive support.
            </Body>
          </View>

          {/* Features */}
          <View>
            <Heading>Features</Heading>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.md,
              }}
            >
              {FEATURES.map((f) => (
                <View
                  key={f.title}
                  style={{
                    flexGrow: 1,
                    flexBasis: 280,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: radius.lg,
                    padding: spacing.lg,
                    gap: spacing.xs,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.title.fontFamily,
                      fontSize: typography.title.fontSize,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {f.title}
                  </Text>
                  <Body muted>{f.text}</Body>
                </View>
              ))}
            </View>
          </View>

          {/* How it works */}
          <View style={{ gap: spacing.sm }}>
            <Heading>How it works</Heading>
            {STEPS.map((s, i) => (
              <Body key={s}>{`${i + 1}. ${s}`}</Body>
            ))}
          </View>

          {/* Accessibility */}
          <View>
            <Heading>Accessibility</Heading>
            <Body>
              This website uses the Atkinson Hyperlegible font and works with
              the keyboard (Tab, Enter, Ctrl + K). Inside the app, students
              control their own accessibility settings.
            </Body>
          </View>

          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            Batangas State University • ARASOF–Nasugbu
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
