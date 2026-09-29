// app/reader/[docId].tsx
//
// Document Reader: reads a handout aloud sentence by sentence, with the
// current sentence shown large and highlighted. Sits outside the Drawer so
// it unmounts (and stops speaking) when the student leaves.

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../context/ThemeContext";
import {
    MAX_SPEED,
    MIN_SPEED,
    SPEED_STEP,
    useDocumentReader,
} from "../../hooks/useDocumentReader";
import { useFeatures } from "../../hooks/useFeatures";
import { DocumentDetail, getDocument } from "../../utils/documentApi";
import { speakPrompt } from "../../utils/speakPrompt";

const formatSpeed = (s: number) => `${s.toFixed(2).replace(/0$/, "")}x`;

export default function DocumentReaderScreen() {
  const router = useRouter();
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const { colors, typography, spacing, radius } = useTheme();
  const { hasFeature } = useFeatures();

  const wantsVoicePrompts = hasFeature("voice_navigation_prompts");
  const wantsLargeText = hasFeature("large_text");
  const wantsHighContrast = hasFeature("high_contrast");
  const wantsLargeTargets = hasFeature("large_touch_targets");

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showVoices, setShowVoices] = useState(false);

  const reader = useDocumentReader(docId, doc?.text);
  const listRef = useRef<FlatList<string>>(null);
  const announcedReady = useRef(false);
  const prevFinished = useRef(false);

  // Colors (high contrast overrides the theme)
  const bg = wantsHighContrast ? "#000000" : colors.background;
  const textColor = wantsHighContrast ? "#FFFFFF" : colors.text;
  const mutedColor = wantsHighContrast ? "#CCCCCC" : colors.textSecondary;
  const panelBg = wantsHighContrast ? "#111111" : colors.surface;
  const borderColor = wantsHighContrast ? "#FFFFFF" : colors.border;
  const highlightBg = wantsHighContrast ? "#FFEB3B" : colors.primary;
  const highlightText = wantsHighContrast ? "#000000" : "#FFFFFF";

  const cardFont = wantsLargeText ? 30 : 24;
  const listFont = wantsLargeText ? 20 : 16;
  const bigBtn = wantsLargeTargets ? 80 : 64;
  const smallBtn = wantsLargeTargets ? 64 : 52;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/documents" as any);
  };

  // Load the document
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getDocument(docId);
        if (!cancelled) setDoc(data.document);
      } catch (error: any) {
        if (!cancelled) {
          setErrorMsg(
            error.response?.data?.message ?? "Could not load this document.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  // "Document ready" prompt, once
  useEffect(() => {
    if (doc && reader.ready && !announcedReady.current) {
      announcedReady.current = true;
      speakPrompt(wantsVoicePrompts, "Document ready. Tap play to listen.");
    }
  }, [doc, reader.ready, wantsVoicePrompts]);

  // "Finished" prompt when the last sentence ends
  useEffect(() => {
    if (reader.finished && !prevFinished.current) {
      speakPrompt(wantsVoicePrompts, "Finished reading.");
    }
    prevFinished.current = reader.finished;
  }, [reader.finished, wantsVoicePrompts]);

  // Keep the highlighted sentence in view
  useEffect(() => {
    if (reader.sentences.length === 0) return;
    try {
      listRef.current?.scrollToIndex({
        index: reader.currentIndex,
        viewPosition: 0.3,
        animated: true,
      });
    } catch {
      // list not laid out yet — onScrollToIndexFailed handles it
    }
  }, [reader.currentIndex, reader.sentences.length]);

  const handlePlayPause = () => {
    if (reader.isPlaying) {
      reader.pause();
      speakPrompt(wantsVoicePrompts, "Paused.");
    } else {
      reader.play();
    }
  };

  const roundBtn = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
    size: number,
    primary = false,
    disabled = false,
  ) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: primary ? highlightBg : panelBg,
        borderWidth: primary ? 0 : 2,
        borderColor,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Ionicons
        name={icon}
        size={size * 0.45}
        color={primary ? highlightText : textColor}
      />
    </TouchableOpacity>
  );

  // ---------- states ----------

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={{
            color: mutedColor,
            marginTop: spacing.md,
            fontFamily: typography.body.fontFamily,
          }}
        >
          Loading document…
        </Text>
      </SafeAreaView>
    );
  }

  if (errorMsg || !doc || reader.sentences.length === 0) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: bg, padding: spacing.lg }]}
      >
        <Ionicons name="alert-circle-outline" size={44} color={mutedColor} />
        <Text
          style={{
            color: textColor,
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            textAlign: "center",
            marginTop: spacing.md,
          }}
        >
          {errorMsg ?? "There is no readable text in this document."}
        </Text>
        <TouchableOpacity
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ marginTop: spacing.lg, padding: spacing.md, minHeight: 48 }}
        >
          <Text
            style={{
              color: colors.primary,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              fontWeight: "700",
            }}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const total = reader.sentences.length;
  const current = reader.sentences[reader.currentIndex] ?? "";

  // Prefer English/Filipino voices; fall back to whatever the device has
  const preferred = reader.voices.filter((v) =>
    /^(en|fil|tl)/i.test(v.language || ""),
  );
  const voiceChoices = (preferred.length > 0 ? preferred : reader.voices).slice(
    0,
    15,
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      {/* Top bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
        }}
      >
        <TouchableOpacity
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={{ flexDirection: "row", alignItems: "center", minHeight: 44 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.primary,
              marginLeft: 6,
              fontWeight: "600",
            }}
          >
            Back
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xs }}>
        <Text
          numberOfLines={2}
          accessibilityRole="header"
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: typography.title.fontSize,
            fontWeight: "700",
            color: textColor,
          }}
        >
          {doc.filename}
        </Text>
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: mutedColor,
            marginTop: 2,
          }}
        >
          Sentence {reader.currentIndex + 1} of {total}
          {reader.resumed && !reader.isPlaying
            ? " · picking up where you left off"
            : ""}
          {reader.finished ? " · finished" : ""}
        </Text>
      </View>

      {/* Current sentence, large and high contrast */}
      <View
        style={{
          marginHorizontal: spacing.lg,
          marginTop: spacing.md,
          maxHeight: 220,
          backgroundColor: highlightBg,
          borderRadius: radius.lg,
        }}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: cardFont,
              lineHeight: cardFont * 1.35,
              fontWeight: "600",
              color: highlightText,
            }}
          >
            {current}
          </Text>
        </ScrollView>
      </View>

      {/* Whole document, tap a sentence to jump there */}
      <FlatList
        ref={listRef}
        data={reader.sentences}
        keyExtractor={(_, i) => String(i)}
        extraData={reader.currentIndex}
        style={{ flex: 1, marginTop: spacing.md }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.lg,
        }}
        initialNumToRender={20}
        windowSize={11}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          });
          setTimeout(() => {
            try {
              listRef.current?.scrollToIndex({
                index: info.index,
                viewPosition: 0.3,
                animated: false,
              });
            } catch {}
          }, 100);
        }}
        renderItem={({ item, index }) => {
          const active = index === reader.currentIndex;
          return (
            <TouchableOpacity
              onPress={() => reader.jumpToSentence(index)}
              accessibilityRole="button"
              accessibilityLabel={`Sentence ${index + 1}. ${item}`}
              accessibilityHint="Jumps the reader to this sentence"
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                minHeight: wantsLargeTargets ? 64 : 44,
                justifyContent: "center",
                borderRadius: radius.sm,
                marginBottom: 4,
                backgroundColor: active ? highlightBg : "transparent",
              }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: listFont,
                  lineHeight: listFont * 1.4,
                  color: active ? highlightText : textColor,
                  fontWeight: active ? "700" : "400",
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Controls */}
      <View
        style={{
          backgroundColor: panelBg,
          borderTopWidth: 1,
          borderTopColor: borderColor,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        {showVoices && (
          <ScrollView
            style={{ maxHeight: 150, marginBottom: spacing.md }}
            contentContainerStyle={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {[{ identifier: null as string | null, name: "Default voice" }]
              .concat(
                voiceChoices.map((v) => ({
                  identifier: v.identifier,
                  name: `${v.name || v.identifier} (${v.language})`,
                })),
              )
              .map((v) => {
                const selected = reader.voiceId === v.identifier;
                return (
                  <TouchableOpacity
                    key={v.identifier ?? "default"}
                    onPress={() => reader.setVoice(v.identifier)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Voice: ${v.name}`}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      minHeight: 44,
                      justifyContent: "center",
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: selected ? highlightBg : borderColor,
                      backgroundColor: selected ? highlightBg : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.caption.fontSize,
                        fontWeight: "600",
                        color: selected ? highlightText : textColor,
                      }}
                    >
                      {v.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        )}

        {/* Prev / Play / Next */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.lg,
          }}
        >
          {roundBtn(
            "play-skip-back",
            "Previous sentence",
            reader.prev,
            smallBtn,
            false,
            reader.currentIndex === 0,
          )}
          {roundBtn(
            reader.isPlaying ? "pause" : "play",
            reader.isPlaying
              ? "Pause"
              : reader.finished
                ? "Read again"
                : "Play",
            handlePlayPause,
            bigBtn,
            true,
          )}
          {roundBtn(
            "play-skip-forward",
            "Next sentence",
            reader.next,
            smallBtn,
            false,
            reader.currentIndex >= total - 1,
          )}
        </View>

        {/* Speed + Voice */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: spacing.md,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {roundBtn(
              "remove",
              "Slower",
              () => reader.setSpeed(reader.speed - SPEED_STEP),
              44,
              false,
              reader.speed <= MIN_SPEED,
            )}
            <Text
              accessibilityLabel={`Speed ${formatSpeed(reader.speed)}`}
              style={{
                minWidth: 56,
                textAlign: "center",
                fontFamily: typography.title.fontFamily,
                fontSize: 18,
                fontWeight: "700",
                color: textColor,
              }}
            >
              {formatSpeed(reader.speed)}
            </Text>
            {roundBtn(
              "add",
              "Faster",
              () => reader.setSpeed(reader.speed + SPEED_STEP),
              44,
              false,
              reader.speed >= MAX_SPEED,
            )}
          </View>

          <TouchableOpacity
            onPress={() => setShowVoices((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showVoices }}
            accessibilityLabel="Choose voice"
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: 44,
              paddingHorizontal: 14,
              borderRadius: radius.md,
              borderWidth: 2,
              borderColor,
            }}
          >
            <Ionicons name="person-outline" size={18} color={textColor} />
            <Text
              style={{
                marginLeft: 6,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                fontWeight: "600",
                color: textColor,
              }}
            >
              Voice
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
