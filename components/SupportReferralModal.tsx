// components/SupportReferralModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
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

import { useTheme } from "../context/ThemeContext";
import {
    REFERRAL_CONCERNS,
    ReferralClass,
    ReferralConcern,
} from "../utils/api";

export type SupportReferralPayload = {
  classId: number;
  concern: ReferralConcern;
  note: string;
};

type Props = {
  visible: boolean;
  studentName: string;
  classes: ReferralClass[];
  loadingClasses: boolean;
  sending: boolean;
  onClose: () => void;
  onSend: (payload: SupportReferralPayload) => void;
};

const MAX_LENGTH = 500;

export default function SupportReferralModal({
  visible,
  studentName,
  classes,
  loadingClasses,
  sending,
  onClose,
  onSend,
}: Props) {
  const { colors, typography, spacing, radius } = useTheme();

  const firstName = useMemo(
    () => studentName.trim().split(/\s+/)[0] || "the student",
    [studentName],
  );

  const [classId, setClassId] = useState<number | null>(null);
  const [concern, setConcern] = useState<ReferralConcern | null>(null);
  const [note, setNote] = useState("");

  // Start clean every time the modal opens
  useEffect(() => {
    if (!visible) return;
    setClassId(null);
    setConcern(null);
    setNote("");
  }, [visible]);

  // If there is only one class, pick it automatically
  useEffect(() => {
    if (visible && classes.length === 1) {
      setClassId(classes[0].id);
    }
  }, [visible, classes]);

  const canSend = classId !== null && concern !== null && !sending;

  const handleSend = () => {
    if (!canSend || classId === null || concern === null) return;
    onSend({ classId, concern, note: note.trim() });
  };

  const renderChip = (
    key: string,
    label: string,
    active: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.primary : colors.surface,
          borderRadius: radius.xl,
          paddingHorizontal: spacing.sm + 4,
          paddingVertical: spacing.sm,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          fontWeight: "600",
          color: active ? "#FFFFFF" : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const labelStyle = {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    fontWeight: "700" as const,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 8,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: spacing.lg }}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: typography.title.fontFamily,
                    fontSize: typography.title.fontSize,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                  accessibilityRole="header"
                >
                  Refer {firstName} to a teacher
                </Text>

                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.textSecondary,
                    marginTop: 3,
                    lineHeight: typography.caption.fontSize + 5,
                  }}
                >
                  Ask the teacher of one of {firstName}'s classes to follow up.
                  Nothing is sent until you tap Send.
                </Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Class */}
            <Text style={labelStyle}>Related class</Text>

            {loadingClasses ? (
              <ActivityIndicator
                color={colors.primary}
                accessibilityLabel="Loading classes"
              />
            ) : classes.length === 0 ? (
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  fontStyle: "italic",
                }}
              >
                {firstName} isn't enrolled in any active class yet, so there is
                no teacher to refer to.
              </Text>
            ) : (
              <View style={[styles.chipWrap, { gap: 8 }]}>
                {classes.map((c) =>
                  renderChip(
                    String(c.id),
                    `${c.title} • ${c.teacherName}`,
                    classId === c.id,
                    () => setClassId(c.id),
                  ),
                )}
              </View>
            )}

            {/* Concern */}
            <Text style={labelStyle}>Concern</Text>
            <View style={[styles.chipWrap, { gap: 8 }]}>
              {REFERRAL_CONCERNS.map((item) =>
                renderChip(item, item, concern === item, () =>
                  setConcern(item),
                ),
              )}
            </View>

            {/* Note */}
            <Text style={labelStyle}>Short note (optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.secondaryBackground,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.text,
                },
              ]}
              value={note}
              onChangeText={setNote}
              placeholder="What would help the teacher support this student in class?"
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={MAX_LENGTH}
              textAlignVertical="top"
              accessibilityLabel="Note to the teacher"
            />

            <Text
              style={{
                alignSelf: "flex-end",
                marginTop: 4,
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize - 1,
                color: colors.placeholder,
              }}
            >
              {note.length}/{MAX_LENGTH}
            </Text>

            {/* Privacy note */}
            <View
              style={[
                styles.privacyBox,
                {
                  backgroundColor: colors.secondaryBackground,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.sm + 4,
                  marginTop: spacing.md,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={colors.primary}
              />
              <Text
                style={{
                  flex: 1,
                  marginLeft: 8,
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  lineHeight: typography.caption.fontSize + 5,
                }}
              >
                The teacher sees the class, the concern and your note. They do
                not see {firstName}'s support needs or SIS. {firstName} is told
                that a referral was sent (the concern, not your note). The
                teacher can acknowledge or reply to you.
              </Text>
            </View>

            {/* Actions */}
            <View
              style={[styles.actionRow, { marginTop: spacing.lg, gap: 10 }]}
            >
              <TouchableOpacity
                onPress={onClose}
                disabled={sending}
                style={[
                  styles.button,
                  {
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm + 4,
                    backgroundColor: colors.surface,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    fontWeight: "700",
                    color: colors.textSecondary,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSend}
                disabled={!canSend}
                style={[
                  styles.button,
                  {
                    flex: 1.6,
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm + 4,
                    backgroundColor: colors.primary,
                    opacity: canSend ? 1 : 0.5,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send referral to teacher"
                accessibilityState={{ disabled: !canSend }}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.sendRow}>
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                        fontWeight: "700",
                        color: "#FFFFFF",
                        marginLeft: 8,
                      }}
                    >
                      Send referral
                    </Text>
                  </View>
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
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  sheet: {
    maxHeight: "92%",
    borderWidth: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },

  input: {
    borderWidth: 1,
    minHeight: 110,
  },

  privacyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
  },

  actionRow: {
    flexDirection: "row",
  },

  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  sendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
