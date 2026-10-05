// app/index.web.tsx
// IncluEd — Cinematic Web Landing Page
// Keeps the existing Expo Router / Ngrok functionality.

import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../context/ThemeContext";

const APK_URL = "/downloads/IncluEd.apk";

const FEATURES = [
  {
    number: "01",
    title: "Adaptive Support",
    text: "IncluEd adapts the experience around each student's preferred way of learning, communicating, and participating.",
    symbol: "✦",
  },
  {
    number: "02",
    title: "Live Captions",
    text: "Follow classroom conversations with accessible captions and transcripts designed to keep students connected.",
    symbol: "◌",
  },
  {
    number: "03",
    title: "Quick Talk",
    text: "Communicate quickly with teachers during class through accessible text-to-speech and communication tools.",
    symbol: "⌁",
  },
  {
    number: "04",
    title: "Guidance Support",
    text: "Stay connected with the Guidance Office for appointments, messages, referrals, and student support.",
    symbol: "◇",
  },
  {
    number: "05",
    title: "Campus Access",
    text: "Discover campus events, accessibility information, maps, and ways to report barriers.",
    symbol: "⌖",
  },
  {
    number: "06",
    title: "Personal Control",
    text: "Students can change accessibility preferences whenever they need to.",
    symbol: "◈",
  },
];

const ROLES = [
  {
    title: "Student",
    subtitle: "Your learning experience",
    description:
      "Access classes, communication tools, accessibility preferences, Guidance support, and campus resources in one place.",
    symbol: "✦",
  },
  {
    title: "Teacher",
    subtitle: "Your classroom connection",
    description:
      "Manage classes, communicate with students, view accommodations, and coordinate support when needed.",
    symbol: "◇",
  },
  {
    title: "Guidance",
    subtitle: "Your support network",
    description:
      "Monitor student support, manage appointments, referrals, messages, and accessibility concerns.",
    symbol: "◈",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Discover",
    text: "Students choose the support and accessibility preferences that work best for them.",
  },
  {
    number: "02",
    title: "Adapt",
    text: "IncluEd adjusts the experience around those preferences.",
  },
  {
    number: "03",
    title: "Participate",
    text: "Students join classes, communicate, learn, and take part in campus life.",
  },
  {
    number: "04",
    title: "Connect",
    text: "Teachers and Guidance provide support through the connected staff experience.",
  },
];

const NAV_ITEMS = [
  { label: "About", id: "about" },
  { label: "Features", id: "features" },
  { label: "Experience", id: "experience" },
  { label: "Access", id: "access" },
];

export default function LandingPage() {
  const router = useRouter();
  const { colors, typography, spacing, radius, reduceMotion } = useTheme();

  const { width } = Dimensions.get("window");
  const isMobile = width < 760;
  const isSmall = width < 520;

  const openStaffPortal = () => {
    router.push("/staff-login" as any);
  };

  const openApp = () => {
    router.push("/role-select" as any);
  };

  const downloadApk = () => {
    if (Platform.OS === "web") {
      window.location.href = APK_URL;
    }
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/staff-login" as any);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [router]);

  const scrollTo = (id: string) => {
    if (Platform.OS !== "web") return;

    const element = document.getElementById(id);

    if (element) {
      element.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    }
  };

  const GlassButton = ({
    label,
    onPress,
    filled = false,
    compact = false,
  }: {
    label: string;
    onPress: () => void;
    filled?: boolean;
    compact?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.glassButton,
        {
          backgroundColor: filled
            ? colors.primary
            : "rgba(255,255,255,0.055)",
          borderColor: filled
            ? colors.primary
            : "rgba(255,255,255,0.20)",
          borderRadius: compact ? 12 : radius.xl,
          paddingVertical: compact ? 10 : 13,
          paddingHorizontal: compact ? 17 : 22,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: typography.button.fontFamily,
          fontSize: compact ? 13 : typography.button.fontSize,
          fontWeight: typography.button.fontWeight,
          color: "#FFFFFF",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  const OutlineButton = ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.outlineButton,
        {
          borderColor: "rgba(255,255,255,0.30)",
          borderRadius: radius.xl,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: typography.button.fontFamily,
          fontSize: typography.button.fontSize,
          fontWeight: typography.button.fontWeight,
          color: "#FFFFFF",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  const SectionLabel = ({ children }: { children: string }) => (
    <View style={styles.sectionLabel}>
      <View
        style={[
          styles.sectionLabelLine,
          {
            backgroundColor: colors.primaryLight,
          },
        ]}
      />
      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 2.5,
          color: colors.primaryLight,
          textTransform: "uppercase",
        }}
      >
        {children}
      </Text>
    </View>
  );

  const BodyText = ({
    children,
    muted = false,
    dark = false,
  }: {
    children: string;
    muted?: boolean;
    dark?: boolean;
  }) => (
    <Text
      style={{
        fontFamily: typography.body.fontFamily,
        fontSize: isMobile ? 15 : 17,
        lineHeight: isMobile ? 25 : 29,
        color: dark
          ? colors.text
          : muted
            ? "rgba(255,255,255,0.62)"
            : "rgba(255,255,255,0.82)",
      }}
    >
      {children}
    </Text>
  );

  return (
    <SafeAreaView
      style={[
        styles.page,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ============================================================
            HERO
        ============================================================ */}
        <View style={styles.hero}>
          {/* Cinematic background layers */}
          <View
            pointerEvents="none"
            style={[
              styles.heroGlow,
              {
                backgroundColor: colors.primary,
                opacity: 0.19,
              },
            ]}
          />

          <View
            pointerEvents="none"
            style={[
              styles.heroGlowTwo,
              {
                backgroundColor: colors.primaryLight,
                opacity: 0.10,
              },
            ]}
          />

          <View
            pointerEvents="none"
            style={[
              styles.heroOrb,
              {
                borderColor: "rgba(255,255,255,0.08)",
              },
            ]}
          />

          <View
            pointerEvents="none"
            style={[
              styles.heroOrbInner,
              {
                borderColor: "rgba(255,255,255,0.045)",
              },
            ]}
          />

          <View style={styles.heroNoise} pointerEvents="none" />

          {/* Navigation */}
          <View
            style={[
              styles.navbar,
              {
                width: "100%",
                maxWidth: 1240,
                alignSelf: "center",
                paddingHorizontal: isMobile ? 18 : 28,
              },
            ]}
          >
            <Pressable
              onPress={() => scrollTo("top")}
              accessibilityRole="button"
              accessibilityLabel="IncluEd home"
              style={styles.brand}
            >
              <View
                style={[
                  styles.brandMark,
                  {
                    borderColor: colors.primaryLight,
                  },
                ]}
              >
                <Text style={styles.brandMarkText}>I</Text>
              </View>

              <View>
                <Text
                  style={[
                    styles.brandName,
                    {
                      fontFamily: typography.title.fontFamily,
                    },
                  ]}
                >
                  IncluEd
                </Text>

                <Text
                  style={[
                    styles.brandSub,
                    {
                      fontFamily: typography.caption.fontFamily,
                    },
                  ]}
                >
                  INCLUSIVE EDUCATION
                </Text>
              </View>
            </Pressable>

            {!isMobile && (
              <View style={styles.navLinks}>
                {NAV_ITEMS.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => scrollTo(item.id)}
                    accessibilityRole="link"
                    accessibilityLabel={`Go to ${item.label}`}
                    style={styles.navLink}
                  >
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.70)",
                        letterSpacing: 0.4,
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}

                <GlassButton
                  label="Staff Portal"
                  onPress={openStaffPortal}
                  compact
                />
              </View>
            )}

            {isMobile && (
              <Pressable
                onPress={openStaffPortal}
                style={styles.mobileStaffButton}
              >
                <Text
                  style={{
                    fontFamily: typography.button.fontFamily,
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#FFFFFF",
                  }}
                >
                  STAFF
                </Text>
              </Pressable>
            )}
          </View>

          {/* Hero content */}
          <View
            nativeID="top"
            style={[
              styles.heroContent,
              {
                paddingHorizontal: isMobile ? 22 : 42,
                paddingTop: isMobile ? 82 : 115,
                paddingBottom: isMobile ? 90 : 125,
              },
            ]}
          >
            <View
              style={[
                styles.heroTextColumn,
                {
                  maxWidth: isMobile ? 600 : 760,
                },
              ]}
            >
              <View style={styles.heroEyebrow}>
                <View
                  style={[
                    styles.eyebrowDot,
                    {
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                />
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: 12,
                    fontWeight: "700",
                    letterSpacing: 3,
                    color: "rgba(255,255,255,0.66)",
                  }}
                >
                  BATANGAS STATE UNIVERSITY
                </Text>
              </View>

              <Text
                accessibilityRole="header"
                style={[
                  styles.heroTitle,
                  {
                    fontFamily: typography.h1.fontFamily,
                    fontSize: isSmall ? 48 : isMobile ? 60 : 86,
                    lineHeight: isSmall ? 53 : isMobile ? 65 : 88,
                  },
                ]}
              >
                Education{"\n"}
                <Text style={{ color: colors.primaryLight }}>
                  without barriers.
                </Text>
              </Text>

              <View
                style={[
                  styles.heroDivider,
                  {
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              />

              <Text
                style={[
                  styles.heroDescription,
                  {
                    fontFamily: typography.body.fontFamily,
                    maxWidth: 680,
                  },
                ]}
              >
                IncluEd is an inclusive education support system designed to
                help students participate, communicate, learn, and stay
                connected with the people who support them.
              </Text>

              <View
                style={[
                  styles.heroActions,
                  {
                    flexDirection: isSmall ? "column" : "row",
                    alignItems: isSmall ? "stretch" : "center",
                  },
                ]}
              >
                <GlassButton
                  label="Enter IncluEd"
                  onPress={openApp}
                  filled
                />

                <OutlineButton
                  label="Download App"
                  onPress={downloadApk}
                />
              </View>

              <Text
                style={[
                  styles.heroHint,
                  {
                    fontFamily: typography.caption.fontFamily,
                  },
                ]}
              >
                Android app • Staff Portal available on web
              </Text>
            </View>

            {/* Hero decorative object */}
            <View
              pointerEvents="none"
              style={[
                styles.heroEmblem,
                {
                  opacity: isMobile ? 0.28 : 0.52,
                },
              ]}
            >
              <View
                style={[
                  styles.emblemOuter,
                  {
                    borderColor: "rgba(255,255,255,0.14)",
                  },
                ]}
              />
              <View
                style={[
                  styles.emblemMiddle,
                  {
                    borderColor: colors.primaryLight,
                  },
                ]}
              />
              <View
                style={[
                  styles.emblemCore,
                  {
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              />
              <Text style={styles.emblemLetter}>I</Text>
            </View>
          </View>

          {/* Bottom cinematic strip */}
          <View style={styles.heroBottom}>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                color: "rgba(255,255,255,0.38)",
                fontSize: 10,
                letterSpacing: 2.4,
              }}
            >
              A MORE ACCESSIBLE CAMPUS EXPERIENCE
            </Text>

            <View style={styles.scrollIndicator}>
              <View
                style={{
                  width: 1,
                  height: 34,
                  backgroundColor: "rgba(255,255,255,0.30)",
                }}
              />
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  color: "rgba(255,255,255,0.40)",
                  fontSize: 10,
                  letterSpacing: 1.5,
                }}
              >
                SCROLL
              </Text>
            </View>
          </View>
        </View>

        {/* ============================================================
            ABOUT
        ============================================================ */}
        <View
          nativeID="about"
          style={[
            styles.section,
            {
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={styles.sectionInner}>
            <SectionLabel>About IncluEd</SectionLabel>

            <View
              style={[
                styles.aboutGrid,
                {
                  flexDirection: isMobile ? "column" : "row",
                },
              ]}
            >
              <View style={styles.aboutHeadingColumn}>
                <Text
                  style={[
                    styles.darkSectionTitle,
                    {
                      fontFamily: typography.h1.fontFamily,
                      fontSize: isMobile ? 39 : 55,
                      lineHeight: isMobile ? 45 : 61,
                      color: colors.text,
                    },
                  ]}
                >
                  A support system built around{" "}
                  <Text style={{ color: colors.primary }}>
                    participation.
                  </Text>
                </Text>
              </View>

              <View style={styles.aboutBodyColumn}>
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: isMobile ? 16 : 19,
                    lineHeight: isMobile ? 27 : 31,
                    color: colors.textSecondary,
                  }}
                >
                  IncluEd adds an accessibility layer to the university
                  experience. It brings together classroom communication,
                  accessibility preferences, student support, Guidance
                  services, and campus resources.
                </Text>

                <View style={styles.aboutRule} />

                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: 14,
                    lineHeight: 24,
                    color: colors.textSecondary,
                  }}
                >
                  Students remain in control of their preferences and support
                  experience. Teachers and Guidance can provide assistance
                  without making accessibility a barrier to participation.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================
            FEATURES
        ============================================================ */}
        <View
          nativeID="features"
          style={[
            styles.darkSection,
            {
              backgroundColor: colors.primaryDark,
            },
          ]}
        >
          <View style={styles.sectionInner}>
            <SectionLabel>What IncluEd offers</SectionLabel>

            <View
              style={[
                styles.featureIntro,
                {
                  flexDirection: isMobile ? "column" : "row",
                },
              ]}
            >
              <Text
                style={[
                  styles.lightSectionTitle,
                  {
                    fontFamily: typography.h1.fontFamily,
                    fontSize: isMobile ? 40 : 58,
                    lineHeight: isMobile ? 47 : 63,
                  },
                ]}
              >
                Tools that make{" "}
                <Text style={{ color: colors.primaryLight }}>
                  connection
                </Text>{" "}
                easier.
              </Text>

              <Text
                style={{
                  flex: 1,
                  maxWidth: 480,
                  fontFamily: typography.body.fontFamily,
                  fontSize: 16,
                  lineHeight: 27,
                  color: "rgba(255,255,255,0.62)",
                }}
              >
                From the classroom to the Guidance Office, IncluEd brings
                essential support into one accessible experience.
              </Text>
            </View>

            <View style={styles.featureGrid}>
              {FEATURES.map((feature) => (
                <View
                  key={feature.number}
                  style={[
                    styles.featureCard,
                    {
                      backgroundColor: "rgba(255,255,255,0.045)",
                      borderColor: "rgba(255,255,255,0.10)",
                    },
                  ]}
                >
                  <View style={styles.featureTop}>
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        color: colors.primaryLight,
                        fontSize: 11,
                        fontWeight: "700",
                        letterSpacing: 2,
                      }}
                    >
                      {feature.number}
                    </Text>

                    <Text
                      style={{
                        color: "rgba(255,255,255,0.55)",
                        fontSize: 25,
                      }}
                    >
                      {feature.symbol}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontFamily: typography.title.fontFamily,
                      fontSize: 23,
                      fontWeight: "700",
                      color: "#FFFFFF",
                      marginBottom: 11,
                    }}
                  >
                    {feature.title}
                  </Text>

                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: 14,
                      lineHeight: 23,
                      color: "rgba(255,255,255,0.58)",
                    }}
                  >
                    {feature.text}
                  </Text>

                  <View
                    style={[
                      styles.featureCardLine,
                      {
                        backgroundColor: colors.primaryLight,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ============================================================
            EXPERIENCE / ROLES
        ============================================================ */}
        <View
          nativeID="experience"
          style={[
            styles.section,
            {
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={styles.sectionInner}>
            <SectionLabel>The IncluEd experience</SectionLabel>

            <Text
              style={[
                styles.darkSectionTitle,
                {
                  fontFamily: typography.h1.fontFamily,
                  fontSize: isMobile ? 40 : 58,
                  lineHeight: isMobile ? 47 : 63,
                  color: colors.text,
                  maxWidth: 820,
                },
              ]}
            >
              One ecosystem.{" "}
              <Text style={{ color: colors.primary }}>
                Different perspectives.
              </Text>
            </Text>

            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 16,
                lineHeight: 27,
                color: colors.textSecondary,
                maxWidth: 650,
                marginTop: 16,
                marginBottom: 42,
              }}
            >
              Each role gets the tools it needs while remaining connected to
              the same inclusive education experience.
            </Text>

            <View
              style={[
                styles.roleGrid,
                {
                  flexDirection: isMobile ? "column" : "row",
                },
              ]}
            >
              {ROLES.map((role, index) => (
                <View
                  key={role.title}
                  style={[
                    styles.roleCard,
                    {
                      borderColor:
                        index === 0
                          ? colors.primary
                          : colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <View style={styles.roleNumber}>
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: 10,
                        fontWeight: "700",
                        letterSpacing: 2,
                        color: colors.textSecondary,
                      }}
                    >
                      0{index + 1}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.roleSymbol,
                      {
                        color: colors.primary,
                      },
                    ]}
                  >
                    {role.symbol}
                  </Text>

                  <Text
                    style={{
                      fontFamily: typography.title.fontFamily,
                      fontSize: 27,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {role.title}
                  </Text>

                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      fontSize: 12,
                      fontWeight: "700",
                      letterSpacing: 1.3,
                      color: colors.primary,
                      marginTop: 5,
                      marginBottom: 15,
                      textTransform: "uppercase",
                    }}
                  >
                    {role.subtitle}
                  </Text>

                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: 14,
                      lineHeight: 23,
                      color: colors.textSecondary,
                    }}
                  >
                    {role.description}
                  </Text>

                  <View style={styles.roleBottom}>
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: 11,
                        color: colors.textSecondary,
                      }}
                    >
                      CONNECTED EXPERIENCE
                    </Text>

                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 18,
                      }}
                    >
                      →
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ============================================================
            LIVE CAPTIONS SHOWCASE
        ============================================================ */}
        <View
          style={[
            styles.showcaseSection,
            {
              backgroundColor: "#120A0A",
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.showcaseGlow,
              {
                backgroundColor: colors.primary,
              },
            ]}
          />

          <View style={styles.sectionInner}>
            <View
              style={[
                styles.showcaseGrid,
                {
                  flexDirection: isMobile ? "column" : "row",
                },
              ]}
            >
              <View style={styles.showcaseText}>
                <SectionLabel>Classroom connection</SectionLabel>

                <Text
                  style={[
                    styles.lightSectionTitle,
                    {
                      fontFamily: typography.h1.fontFamily,
                      fontSize: isMobile ? 39 : 55,
                      lineHeight: isMobile ? 46 : 61,
                    },
                  ]}
                >
                  Never miss the{" "}
                  <Text style={{ color: colors.primaryLight }}>
                    conversation.
                  </Text>
                </Text>

                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: 16,
                    lineHeight: 27,
                    color: "rgba(255,255,255,0.62)",
                    marginTop: 17,
                    maxWidth: 500,
                  }}
                >
                  IncluEd's classroom communication tools help students stay
                  connected during lessons through captions, transcripts, and
                  accessible communication.
                </Text>

                <View style={styles.showcaseStats}>
                  <View>
                    <Text
                      style={{
                        fontFamily: typography.title.fontFamily,
                        fontSize: 29,
                        color: "#FFFFFF",
                        fontWeight: "700",
                      }}
                    >
                      LIVE
                    </Text>
                    <Text style={styles.statCaption}>CAPTION SUPPORT</Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View>
                    <Text
                      style={{
                        fontFamily: typography.title.fontFamily,
                        fontSize: 29,
                        color: "#FFFFFF",
                        fontWeight: "700",
                      }}
                    >
                      24/7
                    </Text>
                    <Text style={styles.statCaption}>PERSONAL SETTINGS</Text>
                  </View>
                </View>
              </View>

              {/* Caption interface mockup */}
              <View style={styles.captionWindow}>
                <View style={styles.captionWindowTop}>
                  <View style={styles.windowDots}>
                    <View style={styles.windowDot} />
                    <View style={styles.windowDot} />
                    <View style={styles.windowDot} />
                  </View>

                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      fontSize: 10,
                      color: "rgba(255,255,255,0.40)",
                      letterSpacing: 1.2,
                    }}
                  >
                    CLASS SESSION
                  </Text>

                  <View style={styles.liveBadge}>
                    <View
                      style={[
                        styles.liveDot,
                        {
                          backgroundColor: colors.primaryLight,
                        },
                      ]}
                    />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                </View>

                <View style={styles.captionContent}>
                  <Text style={styles.captionSpeaker}>TEACHER</Text>

                  <Text
                    style={[
                      styles.captionMain,
                      {
                        fontFamily: typography.body.fontFamily,
                      },
                    ]}
                  >
                    "Today we're going to discuss how technology can make
                    education more accessible..."
                  </Text>

                  <View style={styles.captionSecondary}>
                    <Text style={styles.captionSpeaker}>STUDENT</Text>
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        color: "rgba(255,255,255,0.62)",
                        fontSize: 14,
                        lineHeight: 22,
                      }}
                    >
                      The captions help me follow along with the discussion.
                    </Text>
                  </View>
                </View>

                <View style={styles.captionBottom}>
                  <Text style={styles.captionBottomText}>
                    CAPTIONS ENABLED
                  </Text>

                  <View style={styles.captionBars}>
                    {[12, 20, 9, 25, 17, 29, 13, 22, 11].map(
                      (height, index) => (
                        <View
                          key={index}
                          style={[
                            styles.captionBar,
                            {
                              height,
                              backgroundColor: colors.primaryLight,
                            },
                          ]}
                        />
                      )
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================
            HOW IT WORKS
        ============================================================ */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
            },
          ]}
        >
          <View style={styles.sectionInner}>
            <SectionLabel>How it works</SectionLabel>

            <View
              style={[
                styles.processHeader,
                {
                  flexDirection: isMobile ? "column" : "row",
                },
              ]}
            >
              <Text
                style={[
                  styles.darkSectionTitle,
                  {
                    fontFamily: typography.h1.fontFamily,
                    fontSize: isMobile ? 40 : 55,
                    lineHeight: isMobile ? 47 : 61,
                    color: colors.text,
                  },
                ]}
              >
                Simple by design.
              </Text>

              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: 16,
                  lineHeight: 26,
                  color: colors.textSecondary,
                  maxWidth: 450,
                }}
              >
                The goal is straightforward: make support easier to access
                without making the student experience complicated.
              </Text>
            </View>

            <View style={styles.stepsContainer}>
              {STEPS.map((step, index) => (
                <View
                  key={step.number}
                  style={[
                    styles.step,
                    {
                      borderTopColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      fontSize: 12,
                      fontWeight: "700",
                      letterSpacing: 2,
                      color: colors.primary,
                    }}
                  >
                    {step.number}
                  </Text>

                  <Text
                    style={{
                      fontFamily: typography.title.fontFamily,
                      fontSize: 22,
                      fontWeight: "700",
                      color: colors.text,
                      marginTop: 18,
                      marginBottom: 9,
                    }}
                  >
                    {step.title}
                  </Text>

                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: 14,
                      lineHeight: 23,
                      color: colors.textSecondary,
                    }}
                  >
                    {step.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ============================================================
            GUIDANCE
        ============================================================ */}
        <View
          style={[
            styles.guidanceSection,
            {
              backgroundColor: colors.background,
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.guidanceSideShape,
              {
                borderColor: colors.primary,
              },
            ]}
          />

          <View style={styles.sectionInner}>
            <View
              style={[
                styles.guidanceGrid,
                {
                  flexDirection: isMobile ? "column" : "row",
                },
              ]}
            >
              <View style={styles.guidanceVisual}>
                <View
                  style={[
                    styles.guidancePanel,
                    {
                      backgroundColor: colors.primaryDark,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      color: colors.primaryLight,
                      fontSize: 10,
                      fontWeight: "700",
                      letterSpacing: 2,
                    }}
                  >
                    GUIDANCE OFFICE
                  </Text>

                  <View style={styles.guidanceIcon}>
                    <Text style={styles.guidanceIconText}>◇</Text>
                  </View>

                  <Text
                    style={{
                      fontFamily: typography.title.fontFamily,
                      color: "#FFFFFF",
                      fontSize: 28,
                      fontWeight: "700",
                    }}
                  >
                    Student Support
                  </Text>

                  <View style={styles.guidanceMiniList}>
                    {[
                      "Appointments",
                      "Messages",
                      "Follow-ups",
                      "Support records",
                    ].map((item) => (
                      <View key={item} style={styles.guidanceMiniItem}>
                        <View
                          style={[
                            styles.miniCheck,
                            {
                              backgroundColor: colors.primaryLight,
                            },
                          ]}
                        />
                        <Text style={styles.miniItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.guidanceText}>
                <SectionLabel>Guidance support</SectionLabel>

                <Text
                  style={[
                    styles.darkSectionTitle,
                    {
                      fontFamily: typography.h1.fontFamily,
                      fontSize: isMobile ? 39 : 53,
                      lineHeight: isMobile ? 46 : 59,
                      color: colors.text,
                    },
                  ]}
                >
                  Support that stays{" "}
                  <Text style={{ color: colors.primary }}>
                    connected.
                  </Text>
                </Text>

                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: 16,
                    lineHeight: 27,
                    color: colors.textSecondary,
                    marginTop: 18,
                  }}
                >
                  IncluEd gives the Guidance Office a clearer way to stay
                  connected with students and respond to support needs.
                </Text>

                <View style={styles.guidanceFeatures}>
                  {[
                    "Appointments and follow-ups",
                    "Student support information",
                    "Messages and referrals",
                    "Accessibility concerns",
                  ].map((item) => (
                    <View key={item} style={styles.guidanceFeature}>
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: 18,
                        }}
                      >
                        +
                      </Text>

                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontSize: 14,
                          color: colors.text,
                        }}
                      >
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================
            ACCESSIBILITY
        ============================================================ */}
        <View
          nativeID="access"
          style={[
            styles.accessSection,
            {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <View style={styles.sectionInner}>
            <View
              style={[
                styles.accessGrid,
                {
                  flexDirection: isMobile ? "column" : "row",
                },
              ]}
            >
              <View style={styles.accessHeading}>
                <SectionLabel>Accessibility first</SectionLabel>

                <Text
                  style={[
                    styles.accessTitle,
                    {
                      fontFamily: typography.h1.fontFamily,
                      fontSize: isMobile ? 40 : 57,
                      lineHeight: isMobile ? 47 : 63,
                    },
                  ]}
                >
                  The experience{"\n"}
                  <Text style={{ color: "rgba(255,255,255,0.54)" }}>
                    adapts to you.
                  </Text>
                </Text>
              </View>

              <View style={styles.accessContent}>
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: 17,
                    lineHeight: 28,
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  Students can control their accessibility preferences
                  instead of being forced into one standard experience.
                </Text>

                <View style={styles.preferenceGrid}>
                  {[
                    "Live captions",
                    "High contrast",
                    "Dyslexia-friendly font",
                    "Simplified interface",
                    "Larger text",
                    "Reduced motion",
                  ].map((item, index) => (
                    <View
                      key={item}
                      style={[
                        styles.preferenceItem,
                        {
                          borderColor: "rgba(255,255,255,0.18)",
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontSize: 13,
                          color: "#FFFFFF",
                        }}
                      >
                        {item}
                      </Text>

                      <Text
                        style={{
                          color: "rgba(255,255,255,0.50)",
                          fontSize: 14,
                        }}
                      >
                        {index % 2 === 0 ? "✓" : "○"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================
            FINAL CTA
        ============================================================ */}
        <View
          style={[
            styles.finalSection,
            {
              backgroundColor: "#090606",
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.finalGlow,
              {
                backgroundColor: colors.primary,
              },
            ]}
          />

          <View style={styles.finalContent}>
            <View
              style={[
                styles.finalSymbol,
                {
                  borderColor: "rgba(255,255,255,0.15)",
                },
              ]}
            >
              <View
                style={[
                  styles.finalSymbolInner,
                  {
                    borderColor: colors.primaryLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.finalSymbolText,
                    {
                      color: colors.primaryLight,
                    },
                  ]}
                >
                  I
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 3,
                color: "rgba(255,255,255,0.46)",
                marginBottom: 20,
              }}
            >
              INCLUSIVE EDUCATION SUPPORT SYSTEM
            </Text>

            <Text
              accessibilityRole="header"
              style={[
                styles.finalTitle,
                {
                  fontFamily: typography.h1.fontFamily,
                  fontSize: isSmall ? 43 : isMobile ? 52 : 72,
                  lineHeight: isSmall ? 50 : isMobile ? 59 : 79,
                },
              ]}
            >
              Everyone deserves{"\n"}
              <Text style={{ color: colors.primaryLight }}>
                a place to belong.
              </Text>
            </Text>

            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 16,
                lineHeight: 27,
                color: "rgba(255,255,255,0.56)",
                maxWidth: 560,
                textAlign: "center",
                marginTop: 20,
              }}
            >
              Discover a more accessible way to participate in learning and
              campus life.
            </Text>

            <View
              style={[
                styles.finalActions,
                {
                  flexDirection: isSmall ? "column" : "row",
                },
              ]}
            >
              <GlassButton
                label="Enter IncluEd"
                onPress={openApp}
                filled
              />

              <OutlineButton
                label="Staff Portal"
                onPress={openStaffPortal}
              />
            </View>

            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: 11,
                color: "rgba(255,255,255,0.30)",
                marginTop: 45,
                textAlign: "center",
              }}
            >
              Staff shortcut: Ctrl + K
            </Text>
          </View>
        </View>

        {/* ============================================================
            FOOTER
        ============================================================ */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: "#050303",
              borderTopColor: "rgba(255,255,255,0.08)",
            },
          ]}
        >
          <View
            style={[
              styles.footerInner,
              {
                flexDirection: isMobile ? "column" : "row",
              },
            ]}
          >
            <View style={styles.footerBrand}>
              <Text
                style={{
                  fontFamily: typography.title.fontFamily,
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#FFFFFF",
                }}
              >
                IncluEd
              </Text>

              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: 10,
                  letterSpacing: 1.5,
                  color: "rgba(255,255,255,0.35)",
                  marginTop: 4,
                }}
              >
                INCLUSIVE EDUCATION
              </Text>
            </View>

            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: 11,
                color: "rgba(255,255,255,0.32)",
                textAlign: isMobile ? "left" : "right",
              }}
            >
              Batangas State University • ARASOF–Nasugbu
              {"\n"}
              Inclusive education support system
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  /* ================================================================
     HERO
  ================================================================ */

  hero: {
    minHeight: 760,
    backgroundColor: "#090606",
    overflow: "hidden",
    position: "relative",
  },

  heroGlow: {
    position: "absolute",
    width: 850,
    height: 850,
    borderRadius: 425,
    right: -330,
    top: -280,
  },

  heroGlowTwo: {
    position: "absolute",
    width: 650,
    height: 650,
    borderRadius: 325,
    left: -330,
    bottom: -320,
  },

  heroOrb: {
    position: "absolute",
    width: 690,
    height: 690,
    borderRadius: 345,
    right: -200,
    top: 100,
    borderWidth: 1,
  },

  heroOrbInner: {
    position: "absolute",
    width: 450,
    height: 450,
    borderRadius: 225,
    right: -80,
    top: 220,
    borderWidth: 1,
  },

  heroNoise: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.035,
    backgroundColor: "#FFFFFF",
  },

  navbar: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  brandMark: {
    width: 35,
    height: 35,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "45deg" }],
  },

  brandMarkText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    transform: [{ rotate: "-45deg" }],
  },

  brandName: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  brandSub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 7,
    letterSpacing: 1.8,
    marginTop: 2,
  },

  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
  },

  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 2,
  },

  mobileStaffButton: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  glassButton: {
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  outlineButton: {
    minHeight: 45,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  heroContent: {
    flex: 1,
    width: "100%",
    maxWidth: 1240,
    alignSelf: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  },

  heroTextColumn: {
    zIndex: 3,
  },

  heroEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 23,
  },

  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -2.3,
  },

  heroDivider: {
    width: 68,
    height: 3,
    marginTop: 27,
    marginBottom: 22,
  },

  heroDescription: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 17,
    lineHeight: 29,
  },

  heroActions: {
    gap: 12,
    marginTop: 30,
  },

  heroHint: {
    color: "rgba(255,255,255,0.33)",
    fontSize: 10,
    marginTop: 17,
  },

  heroEmblem: {
    position: "absolute",
    width: 500,
    height: 500,
    right: -60,
    top: 100,
    alignItems: "center",
    justifyContent: "center",
  },

  emblemOuter: {
    position: "absolute",
    width: 430,
    height: 430,
    borderRadius: 215,
    borderWidth: 1,
    transform: [{ rotate: "25deg" }],
  },

  emblemMiddle: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    transform: [{ rotate: "45deg" }],
  },

  emblemCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
    transform: [{ rotate: "45deg" }],
  },

  emblemLetter: {
    position: "absolute",
    color: "rgba(255,255,255,0.18)",
    fontSize: 175,
    fontWeight: "700",
  },

  heroBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 72,
    paddingHorizontal: 35,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    zIndex: 4,
  },

  scrollIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  /* ================================================================
     COMMON SECTIONS
  ================================================================ */

  section: {
    width: "100%",
    paddingVertical: 105,
  },

  darkSection: {
    width: "100%",
    paddingVertical: 110,
  },

  sectionInner: {
    width: "100%",
    maxWidth: 1160,
    alignSelf: "center",
    paddingHorizontal: 28,
  },

  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 27,
  },

  sectionLabelLine: {
    width: 26,
    height: 2,
  },

  darkSectionTitle: {
    fontWeight: "700",
    letterSpacing: -1.3,
  },

  lightSectionTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -1.4,
  },

  /* ================================================================
     ABOUT
  ================================================================ */

  aboutGrid: {
    gap: 65,
  },

  aboutHeadingColumn: {
    flex: 1,
  },

  aboutBodyColumn: {
    flex: 1,
    maxWidth: 520,
  },

  aboutRule: {
    width: 100,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.12)",
    marginVertical: 27,
  },

  /* ================================================================
     FEATURES
  ================================================================ */

  featureIntro: {
    gap: 55,
    alignItems: "flex-end",
    marginBottom: 50,
  },

  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },

  featureCard: {
    flexGrow: 1,
    flexBasis: 300,
    minHeight: 250,
    padding: 25,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },

  featureTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 38,
  },

  featureCardLine: {
    position: "absolute",
    left: 25,
    bottom: 0,
    width: 32,
    height: 2,
  },

  /* ================================================================
     ROLES
  ================================================================ */

  roleGrid: {
    gap: 15,
  },

  roleCard: {
    flex: 1,
    minHeight: 355,
    padding: 27,
    borderWidth: 1,
  },

  roleNumber: {
    alignSelf: "flex-start",
  },

  roleSymbol: {
    fontSize: 36,
    marginTop: 42,
    marginBottom: 23,
  },

  roleBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 30,
  },

  /* ================================================================
     SHOWCASE
  ================================================================ */

  showcaseSection: {
    width: "100%",
    paddingVertical: 115,
    overflow: "hidden",
    position: "relative",
  },

  showcaseGlow: {
    position: "absolute",
    width: 650,
    height: 650,
    borderRadius: 325,
    right: -250,
    top: -180,
    opacity: 0.12,
  },

  showcaseGrid: {
    gap: 70,
    alignItems: "center",
  },

  showcaseText: {
    flex: 1,
    minWidth: 280,
  },

  showcaseStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30,
    marginTop: 40,
  },

  statDivider: {
    height: 42,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  statCaption: {
    color: "rgba(255,255,255,0.34)",
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 3,
  },

  captionWindow: {
    flex: 1,
    width: "100%",
    maxWidth: 535,
    minHeight: 370,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    overflow: "hidden",
  },

  captionWindowTop: {
    height: 48,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  windowDots: {
    flexDirection: "row",
    gap: 5,
  },

  windowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.20)",
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 4,
  },

  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  liveBadgeText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },

  captionContent: {
    flex: 1,
    padding: 27,
    justifyContent: "center",
  },

  captionSpeaker: {
    color: "rgba(255,255,255,0.33)",
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: 9,
  },

  captionMain: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 31,
    fontWeight: "600",
  },

  captionSecondary: {
    marginTop: 28,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  captionBottom: {
    height: 50,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  captionBottomText: {
    color: "rgba(255,255,255,0.30)",
    fontSize: 8,
    letterSpacing: 1.4,
  },

  captionBars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 30,
  },

  captionBar: {
    width: 2,
    borderRadius: 1,
  },

  /* ================================================================
     PROCESS
  ================================================================ */

  processHeader: {
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 40,
    marginBottom: 58,
  },

  stepsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  step: {
    flex: 1,
    minWidth: 220,
    minHeight: 210,
    paddingTop: 25,
    paddingRight: 30,
    borderTopWidth: 1,
  },

  /* ================================================================
     GUIDANCE
  ================================================================ */

  guidanceSection: {
    width: "100%",
    paddingVertical: 110,
    overflow: "hidden",
    position: "relative",
  },

  guidanceSideShape: {
    position: "absolute",
    width: 600,
    height: 600,
    borderRadius: 300,
    borderWidth: 1,
    right: -360,
    top: -70,
    opacity: 0.06,
  },

  guidanceGrid: {
    alignItems: "center",
    gap: 75,
  },

  guidanceVisual: {
    flex: 1,
    width: "100%",
  },

  guidancePanel: {
    width: "100%",
    maxWidth: 450,
    minHeight: 440,
    padding: 30,
    borderRadius: 4,
    alignSelf: "center",
  },

  guidanceIcon: {
    width: 82,
    height: 82,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.17)",
    marginTop: 75,
    marginBottom: 28,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "45deg" }],
  },

  guidanceIconText: {
    color: "#FFFFFF",
    fontSize: 37,
    transform: [{ rotate: "-45deg" }],
  },

  guidanceMiniList: {
    marginTop: 27,
    gap: 13,
  },

  guidanceMiniItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  miniCheck: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  miniItemText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
  },

  guidanceText: {
    flex: 1,
    maxWidth: 500,
  },

  guidanceFeatures: {
    marginTop: 31,
    gap: 14,
  },

  guidanceFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  /* ================================================================
     ACCESSIBILITY
  ================================================================ */

  accessSection: {
    width: "100%",
    paddingVertical: 105,
  },

  accessGrid: {
    alignItems: "center",
    gap: 70,
  },

  accessHeading: {
    flex: 1,
  },

  accessTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -1.4,
  },

  accessContent: {
    flex: 1,
    maxWidth: 530,
  },

  preferenceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 31,
  },

  preferenceItem: {
    flexGrow: 1,
    flexBasis: 185,
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  /* ================================================================
     FINAL CTA
  ================================================================ */

  finalSection: {
    width: "100%",
    minHeight: 700,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },

  finalGlow: {
    position: "absolute",
    width: 700,
    height: 700,
    borderRadius: 350,
    opacity: 0.09,
    top: -180,
    left: "50%",
    marginLeft: -350,
  },

  finalContent: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 100,
    zIndex: 2,
  },

  finalSymbol: {
    width: 78,
    height: 78,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 35,
    transform: [{ rotate: "45deg" }],
  },

  finalSymbolInner: {
    width: 49,
    height: 49,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  finalSymbolText: {
    fontSize: 24,
    fontWeight: "700",
    transform: [{ rotate: "-45deg" }],
  },

  finalTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: -1.5,
  },

  finalActions: {
    gap: 12,
    marginTop: 34,
  },

  /* ================================================================
     FOOTER
  ================================================================ */

  footer: {
    width: "100%",
    borderTopWidth: 1,
    paddingVertical: 27,
  },

  footerInner: {
    width: "100%",
    maxWidth: 1160,
    alignSelf: "center",
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },

  footerBrand: {
    alignSelf: "flex-start",
  },
});