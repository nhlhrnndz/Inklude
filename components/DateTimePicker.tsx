// components/DateTimePicker.tsx — calendar + time pickers that work on web and phone
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleProp,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";

import { useTheme } from "../context/ThemeContext";

const pad = (n: number) => String(n).padStart(2, "0");

export const toDateString = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayString = () => toDateString(new Date());

function parseDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/* ------------------------------------------------------------------ */
/* DateField                                                           */
/* ------------------------------------------------------------------ */

type DateFieldProps = {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  minDate?: string; // "YYYY-MM-DD" — earlier days are disabled
  style?: StyleProp<ViewStyle>;
};

export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  label = "Date",
  minDate,
  style,
}: DateFieldProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(new Date());

  const selected = parseDate(value);
  const min = minDate ? parseDate(minDate) : null;

  const openPicker = () => {
    const base = selected || min || new Date();
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(true);
  };

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta: number) =>
    setView(new Date(year, month + delta, 1));

  const isDisabled = (day: number) =>
    !!min && new Date(year, month, day).getTime() < min.getTime();

  const isSelected = (day: number) =>
    !!selected &&
    selected.getFullYear() === year &&
    selected.getMonth() === month &&
    selected.getDate() === day;

  const todayStr = todayString();
  const isToday = (day: number) =>
    toDateString(new Date(year, month, day)) === todayStr;

  const display = selected
    ? selected.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  // Don't allow going back before the month of minDate
  const canGoPrev = !min || new Date(year, month, 1).getTime() > min.getTime();

  return (
    <View style={[{ marginBottom: spacing.sm }, style]}>
      <TouchableOpacity
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${display || "Not set"}. Tap to choose`}
        style={{
          backgroundColor: colors.secondaryBackground,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.sm,
          padding: spacing.sm,
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: display ? colors.text : colors.placeholder,
          }}
        >
          {display || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: spacing.lg,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderColor: colors.border,
              borderWidth: 1,
              padding: spacing.md,
            }}
          >
            {/* Month header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing.sm,
              }}
            >
              <TouchableOpacity
                onPress={() => shiftMonth(-1)}
                disabled={!canGoPrev}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: canGoPrev ? 1 : 0.3,
                }}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: 17,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {MONTHS[month]} {year}
              </Text>
              <TouchableOpacity
                onPress={() => shiftMonth(1)}
                accessibilityRole="button"
                accessibilityLabel="Next month"
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            {/* Weekday names */}
            <View style={{ flexDirection: "row" }}>
              {WEEKDAYS.map((w) => (
                <Text
                  key={w}
                  style={{
                    width: `${100 / 7}%`,
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.textSecondary,
                    paddingVertical: 6,
                  }}
                >
                  {w}
                </Text>
              ))}
            </View>

            {/* Days */}
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {cells.map((day, i) => {
                if (day === null) {
                  return (
                    <View
                      key={`e${i}`}
                      style={{ width: `${100 / 7}%`, height: 42 }}
                    />
                  );
                }
                const disabled = isDisabled(day);
                const sel = isSelected(day);
                const today = isToday(day);
                return (
                  <View
                    key={day}
                    style={{
                      width: `${100 / 7}%`,
                      height: 42,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <TouchableOpacity
                      disabled={disabled}
                      onPress={() => {
                        onChange(toDateString(new Date(year, month, day)));
                        setOpen(false);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sel, disabled }}
                      accessibilityLabel={new Date(
                        year,
                        month,
                        day,
                      ).toLocaleDateString([], {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: sel ? colors.primary : "transparent",
                        borderWidth: today && !sel ? 1 : 0,
                        borderColor: colors.primary,
                        opacity: disabled ? 0.3 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontSize: 15,
                          fontWeight: sel || today ? "700" : "400",
                          color: sel ? "#FFFFFF" : colors.text,
                        }}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Footer */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: spacing.sm,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
                accessibilityRole="button"
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontWeight: "700",
                    color: colors.textSecondary,
                  }}
                >
                  Clear
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontWeight: "700",
                    color: colors.primary,
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* TimeField                                                           */
/* ------------------------------------------------------------------ */

type TimeFieldProps = {
  value: string; // "HH:MM" (24-hour) or ""
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function split24(value: string): { h12: number; minute: number; pm: boolean } {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return { h12: 8, minute: 0, pm: false };
  const h = Number(m[1]);
  return { h12: h % 12 === 0 ? 12 : h % 12, minute: Number(m[2]), pm: h >= 12 };
}

function to24(h12: number, minute: number, pm: boolean) {
  const h = (h12 % 12) + (pm ? 12 : 0);
  return `${pad(h)}:${pad(minute)}`;
}

function formatTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return "";
  const { h12, minute, pm } = split24(value);
  return `${h12}:${pad(minute)} ${pm ? "PM" : "AM"}`;
}

export function TimeField({
  value,
  onChange,
  placeholder = "Pick a time",
  label = "Time",
  style,
}: TimeFieldProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const [h12, setH12] = useState(8);
  const [minute, setMinute] = useState(0);
  const [pm, setPm] = useState(false);

  const openPicker = () => {
    const t = split24(value);
    setH12(t.h12);
    setMinute(t.minute);
    setPm(t.pm);
    setOpen(true);
  };

  const display = formatTime(value);

  const option = (text: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={text}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        minHeight: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.sm,
        marginVertical: 2,
        backgroundColor: selected ? colors.primary : "transparent",
      }}
    >
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: 16,
          fontWeight: selected ? "700" : "400",
          color: selected ? "#FFFFFF" : colors.text,
        }}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );

  const columnTitle = (t: string) => (
    <Text
      style={{
        textAlign: "center",
        fontSize: 11,
        fontWeight: "700",
        color: colors.textSecondary,
        marginBottom: 4,
        textTransform: "uppercase",
      }}
    >
      {t}
    </Text>
  );

  return (
    <View style={[{ marginBottom: spacing.sm }, style]}>
      <TouchableOpacity
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${display || "Not set"}. Tap to choose`}
        style={{
          backgroundColor: colors.secondaryBackground,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.sm,
          padding: spacing.sm,
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: display ? colors.text : colors.placeholder,
          }}
        >
          {display || placeholder}
        </Text>
        <Ionicons name="time-outline" size={20} color={colors.primary} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: spacing.lg,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: "100%",
              maxWidth: 340,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderColor: colors.border,
              borderWidth: 1,
              padding: spacing.md,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 17,
                fontWeight: "700",
                color: colors.text,
                textAlign: "center",
                marginBottom: spacing.xs,
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 28,
                fontWeight: "700",
                color: colors.primary,
                textAlign: "center",
                marginBottom: spacing.sm,
              }}
            >
              {h12}:{pad(minute)} {pm ? "PM" : "AM"}
            </Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                {columnTitle("Hour")}
                <ScrollView
                  style={{ height: 200 }}
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                >
                  {HOURS.map((h) =>
                    option(String(h), h === h12, () => setH12(h)),
                  )}
                </ScrollView>
              </View>
              <View style={{ flex: 1 }}>
                {columnTitle("Minute")}
                <ScrollView
                  style={{ height: 200 }}
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                >
                  {MINUTES.map((m) =>
                    option(pad(m), m === minute, () => setMinute(m)),
                  )}
                </ScrollView>
              </View>
              <View style={{ flex: 1 }}>
                {columnTitle("AM / PM")}
                {option("AM", !pm, () => setPm(false))}
                {option("PM", pm, () => setPm(true))}
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: spacing.md,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
                accessibilityRole="button"
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontWeight: "700",
                    color: colors.textSecondary,
                  }}
                >
                  Clear
                </Text>
              </TouchableOpacity>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <TouchableOpacity
                  onPress={() => setOpen(false)}
                  accessibilityRole="button"
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontWeight: "700",
                      color: colors.textSecondary,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    onChange(to24(h12, minute, pm));
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontWeight: "700",
                      color: colors.primary,
                    }}
                  >
                    OK
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
