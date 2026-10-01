// components/ReachOutModal.tsx
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
import type { OutreachMode } from "../utils/belongingApi";

export type ReachOutPayload = {
  body: string;
  mode: OutreachMode;
  templateKey: string | null;
};

type Props = {
  visible: boolean;
  studentName: string;
  needsHelp: boolean;
  quiet: boolean;
  sending: boolean;
  onClose: () => void;
  onSend: (payload: ReachOutPayload) => void;
};

type Template = {
  key: string;
  label: string;
  text: string;
};

const MAX_LENGTH = 1000;

function buildTemplates(firstName: string): Template[] {
  return [
    {
      key: "check_in",
      label: "Gentle check-in",
      text: `Hi ${firstName}, just checking in. How are things going? — Guidance Office`,
    },
    {
      key: "quiet",
      label: "Noticed you're quiet",
      text: `Hi ${firstName}, I noticed you've been a little quiet in class lately, and that's completely okay. I just wanted you to know I'm here if you'd like to talk. — Guidance Office`,
    },
    {
      key: "follow_up",
      label: "Follow up on help",
      text: `Hi ${firstName}, I saw that you let us know you needed help, and I'd like to make sure you get the support you need. When would be a good time for us to talk? — Guidance Office`,
    },
    {
      key: "invite",
      label: "Invite to talk",
      text: `Hi ${firstName}, if you'd ever like to talk about how school is going, the Guidance Office is here for you — whenever you feel comfortable reaching out. — Guidance Office`,
    },
  ];
}

export default function ReachOutModal({
  visible,
  studentName,
  needsHelp,
  quiet,
  sending,
  onClose,
  onSend,
}: Props) {
  const { colors, typography, spacing, radius } = useTheme();

  const firstName = useMemo(
    () => studentName.trim().split(/\s+/)[0] || "there",
    [studentName],
  );

  const templates = useMemo(() => buildTemplates(firstName), [firstName]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [text, setText] = useState("");

  // Every time the modal opens, start from the template that best fits
  // the student's situation. Guidance can change or clear it freely.
  useEffect(() => {
    if (!visible) return;

    const defaultKey = needsHelp ? "follow_up" : quiet ? "quiet" : "check_in";
    const template = templates.find((t) => t.key === defaultKey);

    setSelectedKey(defaultKey);
    setText(template?.text ?? "");
  }, [visible, needsHelp, quiet, templates]);

  const selectedTemplate = templates.find((t) => t.key === selectedKey) ?? null;

  const mode: OutreachMode = !selectedTemplate
    ? "custom"
    : text === selectedTemplate.text
      ? "template"
      : "edited";

  const canSend = text.trim().length > 0 && !sending;

  const pickTemplate = (template: Template) => {
    setSelectedKey(template.key);
    setText(template.text);
  };

  const writeMyOwn = () => {
    setSelectedKey(null);
    setText("");
  };

  const resetToTemplate = () => {
    if (selectedTemplate) {
      setText(selectedTemplate.text);
    }
  };

  const handleSend = () => {
    if (!canSend) return;

    onSend({
      body: text.trim(),
      mode,
      templateKey: selectedKey,
    });
  };

  const renderChip = (
    key: string,
    label: string,
    active: boolean,
    onPress: () => void,
    icon?: keyof typeof Ionicons.glyphMap,
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
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={active ? "#FFFFFF" : colors.textSecondary}
          style={{ marginRight: 5 }}
        />
      )}
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
                  Reach out to {firstName}
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
                  Pick a starting point or write your own. Nothing is sent until
                  you tap Send.
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

            {/* Templates */}
            <Text
              style={[
                styles.label,
                {
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.text,
                  marginTop: spacing.md,
                },
              ]}
            >
              Start from
            </Text>

            <View style={[styles.chipWrap, { gap: 8 }]}>
              {templates.map((template) =>
                renderChip(
                  template.key,
                  template.label,
                  selectedKey === template.key,
                  () => pickTemplate(template),
                ),
              )}

              {renderChip(
                "custom",
                "Write my own",
                selectedKey === null,
                writeMyOwn,
                "create-outline",
              )}
            </View>

            {/* Message box */}
            <View style={[styles.labelRow, { marginTop: spacing.md }]}>
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                Your message
              </Text>

              {mode === "edited" && (
                <TouchableOpacity
                  onPress={resetToTemplate}
                  accessibilityRole="button"
                  accessibilityLabel="Reset message to the template"
                  hitSlop={8}
                >
                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      fontSize: typography.caption.fontSize,
                      fontWeight: "700",
                      color: colors.primary,
                    }}
                  >
                    Reset to template
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.secondaryBackground,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginTop: spacing.sm,
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.text,
                },
              ]}
              value={text}
              onChangeText={setText}
              placeholder="Write what you'd like to say to the student…"
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={MAX_LENGTH}
              textAlignVertical="top"
              accessibilityLabel="Message to the student"
            />

            <View style={[styles.labelRow, { marginTop: 6 }]}>
              <Text
                style={{
                  flex: 1,
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize - 1,
                  color: colors.textSecondary,
                  paddingRight: 8,
                }}
              >
                Goes to {firstName}'s private thread with Guidance. They'll get
                a notification and can reply.
              </Text>

              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize - 1,
                  color: colors.placeholder,
                }}
              >
                {text.length}/{MAX_LENGTH}
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
                accessibilityLabel={`Send message to ${firstName}`}
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
                      Send message
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

  label: {
    fontWeight: "700",
    marginBottom: 8,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    minHeight: 150,
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
