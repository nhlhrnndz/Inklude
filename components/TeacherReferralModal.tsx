// components/TeacherReferralModal.tsx — Teacher: "Refer to Guidance"
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

import { useTheme } from "../context/ThemeContext";
import {
    REFERRAL_CATEGORIES,
    SentReferral,
    TeacherStudent,
    referStudentToGuidance,
} from "../utils/classApi";

const NOTE_MAX = 300;

type Props = {
  student: TeacherStudent | null;
  onClose: () => void;
  onSent: (referral: SentReferral) => void;
};

export default function TeacherReferralModal({
  student,
  onClose,
  onSent,
}: Props) {
  const { colors, typography, spacing, radius } = useTheme();

  const [classId, setClassId] = useState<number | null>(null);
  const [concern, setConcern] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [alreadySpoke, setAlreadySpoke] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);

  // Reset every time a different student is opened
  useEffect(() => {
    if (student) {
      setClassId(student.classes[0]?.id ?? null);
      setConcern(null);
      setNote("");
      setAlreadySpoke(null);
    }
  }, [student]);

  if (!student) return null;

  const canSend = !!classId && !!concern && alreadySpoke !== null && !sending;

  const handleSend = async () => {
    if (!canSend || !classId || !concern) return;
    setSending(true);
    try {
      const res = await referStudentToGuidance({
        studentId: student.id,
        classId,
        concern,
        note: note.trim(),
        alreadySpoke: alreadySpoke === true,
      });
      Toast.show({ type: "success", text1: "Referral sent to Guidance" });
      onSent(res.referral);
      onClose();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not send referral",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const chip = (
    key: string,
    label: string,
    active: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={{
        minHeight: 44,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.surface,
        borderRadius: radius.xl,
        paddingHorizontal: spacing.md,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          fontWeight: "700",
          color: active ? "#FFFFFF" : colors.text,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const label = (text: string) => (
    <Text
      style={{
        fontFamily: typography.body.fontFamily,
        fontSize: typography.body.fontSize,
        fontWeight: "700",
        color: colors.text,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
      }}
    >
      {text}
    </Text>
  );

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!sending) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              padding: spacing.lg,
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: typography.title.fontSize,
                fontWeight: "700",
                color: colors.text,
              }}
              accessibilityRole="header"
            >
              Refer to Guidance
            </Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginTop: 4,
                lineHeight: 18,
              }}
            >
              {student.displayName} may benefit from support. This is not a
              disciplinary report. Guidance will follow up privately.
            </Text>

            {student.classes.length > 1 && (
              <>
                {label("Related class")}
                <View style={styles.chipWrap}>
                  {student.classes.map((c) =>
                    chip(String(c.id), c.title, classId === c.id, () =>
                      setClassId(c.id),
                    ),
                  )}
                </View>
              </>
            )}

            {label("Needs support with")}
            <View style={styles.chipWrap}>
              {REFERRAL_CATEGORIES.map((c) =>
                chip(c, c, concern === c, () => setConcern(c)),
              )}
            </View>

            {label("Have you already spoken with the student?")}
            <View style={styles.chipWrap}>
              {chip("yes", "Yes", alreadySpoke === true, () =>
                setAlreadySpoke(true),
              )}
              {chip("no", "No", alreadySpoke === false, () =>
                setAlreadySpoke(false),
              )}
            </View>

            {label("Short note (optional)")}
            <TextInput
              style={{
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.md,
                minHeight: 90,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
              }}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={NOTE_MAX}
              textAlignVertical="top"
              placeholder="What have you noticed? Keep it factual."
              placeholderTextColor={colors.placeholder}
              accessibilityLabel="Short note"
            />
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: 11,
                color: colors.textSecondary,
                textAlign: "right",
                marginTop: 2,
              }}
            >
              {note.length}/{NOTE_MAX}
            </Text>

            <View
              style={{ flexDirection: "row", gap: 10, marginTop: spacing.md }}
            >
              <TouchableOpacity
                onPress={onClose}
                disabled={sending}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 48,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{ fontWeight: "700", color: colors.textSecondary }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSend}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Send referral"
                accessibilityState={{ disabled: !canSend }}
                style={{
                  flex: 1.5,
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 48,
                  borderRadius: radius.md,
                  backgroundColor: colors.primary,
                  opacity: canSend ? 1 : 0.5,
                }}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ fontWeight: "700", color: "#FFFFFF" }}>
                    Send to Guidance
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap" },
});
