// app/(app)/guidance/appointments.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import SlotPicker from "../../../components/appointments/SlotPicker";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { useLiveRefresh } from "../../../hooks/useLiveRefresh";
import {
    APPOINTMENT_REASONS,
    Appointment,
    AppointmentReason,
    AppointmentStatus,
    cancelMyAppointment,
    getGuidanceAppointments,
    getMyAppointments,
    requestAppointment,
    respondToAppointment,
} from "../../../utils/api";
import { crossAlert } from "../../../utils/crossAlert";

// ---------- helpers ----------

const isOpen = (s: AppointmentStatus) =>
  s === "pending" || s === "confirmed" || s === "rescheduled";

function startOf(a: Appointment) {
  const d = a.confirmedDate || a.preferredDate;
  const t = a.confirmedTime || a.preferredTime;
  return new Date(`${d}T${t}:00`);
}

function fmtWhen(date: string, time: string) {
  const d = new Date(`${date}T${time}:00`);
  return `${d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

// Shared loader: quiet background refresh, re-renders only on real changes.
function useAppointmentList(
  fetcher: () => Promise<{ appointments: Appointment[] }>,
) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const signatureRef = useRef("");
  const errorShownRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetcher();
      const signature = res.appointments
        .map((a) => `${a.id}:${a.status}:${a.updatedAt}`)
        .join("|");

      if (signature !== signatureRef.current) {
        signatureRef.current = signature;
        setItems(res.appointments);
      }
    } catch (err: any) {
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        Toast.show({
          type: "error",
          text1: "Could not load appointments",
          text2: err.response?.data?.message ?? "Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useLiveRefresh(load);

  return { items, loading, reload: load };
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { colors, radius } = useTheme();

  const map: Record<AppointmentStatus, { label: string; color: string }> = {
    pending: { label: "Waiting for Guidance", color: colors.warning },
    confirmed: { label: "Confirmed", color: colors.success },
    rescheduled: { label: "Rescheduled", color: colors.primary },
    declined: { label: "Declined", color: colors.danger },
    cancelled: { label: "Cancelled", color: colors.textSecondary },
    completed: { label: "Completed", color: colors.textSecondary },
  };
  const s = map[status];

  return (
    <View
      style={{
        backgroundColor: s.color + "22",
        borderRadius: radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: s.color, fontSize: 11, fontWeight: "700" }}>
        {s.label}
      </Text>
    </View>
  );
}

// ---------- student view ----------

function StudentView() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const { items, loading, reload } = useAppointmentList(getMyAppointments);

  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState<AppointmentReason | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setReason(null);
    setDate(null);
    setTime(null);
    setNote("");
  };

  const handleSubmit = async () => {
    if (!reason || !date || !time) {
      Toast.show({
        type: "error",
        text1: "Pick a reason, a date and a time.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await requestAppointment({
        reason,
        note: note.trim() || undefined,
        preferredDate: date,
        preferredTime: time,
      });
      Toast.show({ type: "success", text1: "Request sent to Guidance" });
      resetForm();
      setShowForm(false);
      reload();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not send request",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (a: Appointment) => {
    crossAlert(
      "Cancel this appointment?",
      a.status === "pending"
        ? "Your request will be withdrawn."
        : "It will be removed from your calendar.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel appointment",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelMyAppointment(a.id);
              reload();
            } catch (err: any) {
              Toast.show({
                type: "error",
                text1: "Could not cancel",
                text2: err.response?.data?.message ?? "Please try again.",
              });
            }
          },
        },
      ],
    );
  };

  const textBase = {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  };

  const renderCard = (a: Appointment) => {
    const booked = a.status === "confirmed" || a.status === "rescheduled";

    return (
      <View
        key={a.id}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
          opacity: isOpen(a.status) ? 1 : 0.7,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ ...textBase, fontWeight: "700", color: colors.text }}>
            {a.reason}
          </Text>
          <StatusBadge status={a.status} />
        </View>

        <Text style={{ ...textBase, color: colors.primary, marginTop: 6 }}>
          {booked && a.confirmedDate && a.confirmedTime
            ? fmtWhen(a.confirmedDate, a.confirmedTime)
            : fmtWhen(a.preferredDate, a.preferredTime)}
        </Text>

        {a.status === "rescheduled" && (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            You asked for {fmtWhen(a.preferredDate, a.preferredTime)}. Guidance
            chose a different time. Cancel if it doesn't work for you.
          </Text>
        )}

        {!!a.guidanceNote && (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Guidance: {a.guidanceNote}
          </Text>
        )}

        {isOpen(a.status) && (
          <TouchableOpacity
            onPress={() => handleCancel(a)}
            accessibilityRole="button"
            accessibilityLabel={`Cancel ${a.reason} appointment`}
            style={{
              alignSelf: "flex-start",
              minHeight: 44,
              justifyContent: "center",
              marginTop: spacing.xs,
            }}
          >
            <Text
              style={{ ...textBase, fontWeight: "600", color: colors.danger }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => router.replace("/guidance-hub" as any)}
            accessibilityRole="button"
            accessibilityLabel="Back to Guidance"
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: 44,
              alignSelf: "flex-start",
              marginBottom: spacing.md,
            }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
            <Text
              style={{
                ...textBase,
                color: colors.primary,
                fontWeight: "600",
                marginLeft: spacing.sm,
              }}
            >
              Back
            </Text>
          </TouchableOpacity>

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
            Appointments
          </Text>
          <Text
            style={{
              ...textBase,
              color: colors.textSecondary,
              marginTop: 4,
              marginBottom: spacing.lg,
            }}
          >
            Request a time to meet with the Guidance Office.
          </Text>

          {showForm ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.lg,
                padding: spacing.lg,
                marginBottom: spacing.lg,
              }}
            >
              <Text
                style={{
                  fontFamily: typography.title.fontFamily,
                  fontSize: typography.title.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: spacing.sm,
                }}
                accessibilityRole="header"
              >
                New request
              </Text>

              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: 6,
                }}
              >
                Reason
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: spacing.sm,
                }}
              >
                {APPOINTMENT_REASONS.map((r) => {
                  const selected = reason === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setReason(r)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        minHeight: 44,
                        justifyContent: "center",
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected
                          ? colors.primary
                          : colors.secondaryBackground,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontSize: typography.caption.fontSize,
                          fontWeight: "600",
                          color: selected ? "#FFFFFF" : colors.text,
                        }}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <SlotPicker
                date={date}
                time={time}
                onDateChange={setDate}
                onTimeChange={setTime}
              />

              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginTop: spacing.sm,
                  marginBottom: 6,
                }}
              >
                Message (optional)
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Anything Guidance should know beforehand"
                placeholderTextColor={colors.placeholder}
                multiline
                maxLength={500}
                accessibilityLabel="Message for Guidance"
                style={{
                  backgroundColor: colors.secondaryBackground,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.sm,
                  padding: spacing.sm + 2,
                  minHeight: 80,
                  textAlignVertical: "top",
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.text,
                  marginBottom: spacing.md,
                }}
              />

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Send request"
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  minHeight: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: typography.button.fontFamily,
                      fontSize: typography.button.fontSize,
                      fontWeight: "700",
                    }}
                  >
                    Send request
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setShowForm(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={{ alignItems: "center", paddingVertical: spacing.md }}
              >
                <Text style={{ ...textBase, color: colors.textSecondary }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              accessibilityRole="button"
              accessibilityLabel="Request an appointment"
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderColor: colors.primary,
                borderWidth: 1,
                borderRadius: radius.md,
                minHeight: 52,
                marginBottom: spacing.lg,
              }}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={colors.primary}
              />
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: typography.button.fontFamily,
                  fontSize: typography.button.fontSize,
                  fontWeight: "700",
                  marginLeft: 8,
                }}
              >
                Request an appointment
              </Text>
            </TouchableOpacity>
          )}

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
            My appointments
          </Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginTop: spacing.lg }}
            />
          ) : items.length === 0 ? (
            <Text style={{ ...textBase, color: colors.textSecondary }}>
              You have no appointments yet.
            </Text>
          ) : (
            items.map(renderCard)
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------- guidance view ----------

type Tab = "pending" | "upcoming" | "past";
type PanelMode = "confirm" | "decline" | "cancel";

function GuidanceView() {
  const { colors, typography, spacing, radius } = useTheme();
  const { items, loading, reload } = useAppointmentList(
    getGuidanceAppointments,
  );

  const [tab, setTab] = useState<Tab>("pending");
  const [panel, setPanel] = useState<{ id: number; mode: PanelMode } | null>(
    null,
  );
  const [pDate, setPDate] = useState<string | null>(null);
  const [pTime, setPTime] = useState<string | null>(null);
  const [pNote, setPNote] = useState("");
  const [busy, setBusy] = useState(false);

  // An appointment counts as upcoming until 30 minutes after it starts.
  const groups = useMemo(() => {
    const nowMs = Date.now();
    const pending: Appointment[] = [];
    const upcoming: Appointment[] = [];
    const past: Appointment[] = [];

    items.forEach((a) => {
      if (a.status === "pending") {
        pending.push(a);
      } else if (a.status === "confirmed" || a.status === "rescheduled") {
        (startOf(a).getTime() + 30 * 60000 >= nowMs ? upcoming : past).push(a);
      } else {
        past.push(a);
      }
    });

    const byStart = (x: Appointment, y: Appointment) =>
      startOf(x).getTime() - startOf(y).getTime();
    pending.sort(byStart);
    upcoming.sort(byStart);
    past.sort((x, y) => byStart(y, x));

    return { pending, upcoming, past };
  }, [items]);

  const list = groups[tab];

  const openPanel = (a: Appointment, mode: PanelMode) => {
    setPanel({ id: a.id, mode });
    setPDate(a.confirmedDate || a.preferredDate);
    setPTime(a.confirmedTime || a.preferredTime);
    setPNote("");
  };

  const submitPanel = async (a: Appointment) => {
    if (!panel) return;

    if (panel.mode === "confirm" && (!pDate || !pTime)) {
      Toast.show({ type: "error", text1: "Pick a date and a time." });
      return;
    }
    if (panel.mode !== "confirm" && !pNote.trim()) {
      Toast.show({ type: "error", text1: "Add a short reason." });
      return;
    }

    setBusy(true);
    try {
      await respondToAppointment(
        a.id,
        panel.mode === "confirm"
          ? {
              action: "confirm",
              date: pDate!,
              time: pTime!,
              note: pNote.trim() || undefined,
            }
          : { action: panel.mode, note: pNote.trim() },
      );
      Toast.show({ type: "success", text1: "Student notified" });
      setPanel(null);
      await reload();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not update",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async (a: Appointment) => {
    try {
      await respondToAppointment(a.id, { action: "complete" });
      await reload();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not update",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    }
  };

  const textBase = {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  };

  const actionBtn = (
    label: string,
    onPress: () => void,
    kind: "primary" | "outline" | "danger" = "outline",
  ) => {
    const bg = kind === "primary" ? colors.primary : "transparent";
    const border = kind === "danger" ? colors.danger : colors.primary;
    const fg =
      kind === "primary"
        ? "#FFFFFF"
        : kind === "danger"
          ? colors.danger
          : colors.primary;

    return (
      <TouchableOpacity
        key={label}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          minHeight: 44,
          paddingHorizontal: 16,
          justifyContent: "center",
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: border,
          backgroundColor: bg,
        }}
      >
        <Text style={{ color: fg, fontWeight: "700", fontSize: 13 }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPanel = (a: Appointment) => {
    if (!panel || panel.id !== a.id) return null;

    return (
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.divider,
          marginTop: spacing.md,
          paddingTop: spacing.md,
        }}
      >
        {panel.mode === "confirm" && (
          <>
            <Text
              style={{
                ...textBase,
                fontWeight: "700",
                color: colors.text,
                marginBottom: 4,
              }}
            >
              {a.status === "pending" ? "Confirm time" : "Choose a new time"}
            </Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginBottom: spacing.sm,
              }}
            >
              Keep the student's time to confirm, or pick another to reschedule.
            </Text>
            <SlotPicker
              date={pDate}
              time={pTime}
              onDateChange={setPDate}
              onTimeChange={setPTime}
            />
          </>
        )}

        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            fontWeight: "600",
            color: colors.textSecondary,
            marginTop: spacing.sm,
            marginBottom: 6,
          }}
        >
          {panel.mode === "confirm"
            ? "Note to student (optional)"
            : "Reason for the student *"}
        </Text>
        <TextInput
          value={pNote}
          onChangeText={setPNote}
          maxLength={255}
          multiline
          placeholder={
            panel.mode === "confirm"
              ? "e.g. Please bring your ID"
              : "Short reason"
          }
          placeholderTextColor={colors.placeholder}
          accessibilityLabel="Note to student"
          style={{
            backgroundColor: colors.secondaryBackground,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.sm,
            padding: spacing.sm + 2,
            minHeight: 60,
            textAlignVertical: "top",
            ...textBase,
            color: colors.text,
            marginBottom: spacing.md,
          }}
        />

        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              {actionBtn(
                panel.mode === "confirm"
                  ? "Save"
                  : panel.mode === "decline"
                    ? "Decline request"
                    : "Cancel appointment",
                () => submitPanel(a),
                panel.mode === "confirm" ? "primary" : "danger",
              )}
              {actionBtn("Close", () => setPanel(null))}
            </>
          )}
        </View>
      </View>
    );
  };

  const renderCard = (a: Appointment) => {
    const booked = a.status === "confirmed" || a.status === "rescheduled";
    const passed = booked && startOf(a).getTime() + 30 * 60000 < Date.now();

    return (
      <View
        key={a.id}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text
              style={{ ...textBase, fontWeight: "700", color: colors.text }}
              numberOfLines={1}
            >
              {a.studentName}
            </Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
              }}
              numberOfLines={1}
            >
              {a.studentEmail}
            </Text>
          </View>
          <StatusBadge status={a.status} />
        </View>

        <Text style={{ ...textBase, color: colors.text, marginTop: 8 }}>
          {a.reason}
        </Text>

        <Text style={{ ...textBase, color: colors.primary, marginTop: 2 }}>
          {booked && a.confirmedDate && a.confirmedTime
            ? fmtWhen(a.confirmedDate, a.confirmedTime)
            : fmtWhen(a.preferredDate, a.preferredTime)}
        </Text>

        {a.status === "rescheduled" && (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginTop: 2,
            }}
          >
            Student asked for {fmtWhen(a.preferredDate, a.preferredTime)}
          </Text>
        )}

        {!!a.note && (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Student: {a.note}
          </Text>
        )}

        {!!a.guidanceNote && (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            Your note: {a.guidanceNote}
          </Text>
        )}

        {!(panel && panel.id === a.id) && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: spacing.md,
            }}
          >
            {a.status === "pending" && (
              <>
                {actionBtn(
                  "Confirm / reschedule",
                  () => openPanel(a, "confirm"),
                  "primary",
                )}
                {actionBtn("Decline", () => openPanel(a, "decline"), "danger")}
              </>
            )}
            {booked && !passed && (
              <>
                {actionBtn("Reschedule", () => openPanel(a, "confirm"))}
                {actionBtn("Mark completed", () => handleComplete(a))}
                {actionBtn("Cancel", () => openPanel(a, "cancel"), "danger")}
              </>
            )}
            {passed &&
              actionBtn("Mark completed", () => handleComplete(a), "primary")}
          </View>
        )}

        {renderPanel(a)}
      </View>
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: `Pending (${groups.pending.length})` },
    { key: "upcoming", label: `Upcoming (${groups.upcoming.length})` },
    { key: "past", label: "Past" },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
            Appointments
          </Text>
          <Text
            style={{
              ...textBase,
              color: colors.textSecondary,
              marginTop: 4,
              marginBottom: spacing.lg,
            }}
          >
            Review requests from students.
          </Text>

          <View
            style={{
              flexDirection: "row",
              backgroundColor: colors.secondaryBackground,
              borderRadius: radius.md,
              padding: 4,
              marginBottom: spacing.lg,
            }}
            accessibilityRole="tablist"
          >
            {tabs.map((t) => {
              const selected = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => {
                    setTab(t.key);
                    setPanel(null);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: radius.md,
                    backgroundColor: selected ? colors.primary : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: selected ? "#FFFFFF" : colors.textSecondary,
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : list.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
              <Ionicons
                name="calendar-outline"
                size={36}
                color={colors.textSecondary}
              />
              <Text
                style={{
                  ...textBase,
                  color: colors.textSecondary,
                  marginTop: spacing.sm,
                }}
              >
                {tab === "pending"
                  ? "No requests waiting."
                  : tab === "upcoming"
                    ? "No upcoming appointments."
                    : "No past appointments."}
              </Text>
            </View>
          ) : (
            list.map(renderCard)
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------- entry ----------

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const { colors, typography } = useTheme();

  if (user?.role === "student") return <StudentView />;
  if (user?.role === "guidance" || user?.role === "admin") {
    return <GuidanceView />;
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <Text
        style={{
          margin: 24,
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          color: colors.textSecondary,
        }}
      >
        Appointments aren't available for this account.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});
