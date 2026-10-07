import { Text, View } from "react-native";

import { useTheme } from "../context/ThemeContext";

export type PwdBarDatum = {
  label: string;
  value: number;
};

type PwdBarChartProps = {
  data: PwdBarDatum[];
  color: string;
  orientation?: "vertical" | "horizontal";
  emptyText?: string;
};

export default function PwdBarChart({
  data,
  color,
  orientation = "horizontal",
  emptyText = "No data yet",
}: PwdBarChartProps) {
  const { colors, typography, radius, spacing } = useTheme();

  const rows = data
    .filter((item) => Number(item.value) > 0)
    .map((item) => ({
      ...item,
      value: Number(item.value),
    }));

  const max = Math.max(0, ...rows.map((item) => item.value));

  if (rows.length === 0 || max === 0) {
    return (
      <View
        style={{
          minHeight: 70,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: spacing.md,
        }}
      >
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          {emptyText}
        </Text>
      </View>
    );
  }

  if (orientation === "vertical") {
    return (
      <View
        accessibilityRole="summary"
        accessibilityLabel={rows
          .map((item) => `${item.label}: ${item.value}`)
          .join(", ")}
      >
        <View
          style={{
            height: 190,
            flexDirection: "row",
            alignItems: "flex-end",
            gap: spacing.sm,
          }}
        >
          {rows.map((item) => {
            const percentage = item.value / max;
            const barHeight = Math.max(
              12,
              Math.round(percentage * 135),
            );

            return (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  height: 190,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  minWidth: 42,
                }}
                accessible
                accessibilityLabel={`${item.label}: ${item.value} students`}
              >
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    fontWeight: "700",
                    color: colors.text,
                    marginBottom: 5,
                  }}
                >
                  {item.value}
                </Text>

                <View
                  style={{
                    width: "70%",
                    maxWidth: 52,
                    minWidth: 18,
                    height: 135,
                    justifyContent: "flex-end",
                  }}
                >
                  <View
                    style={{
                      width: "100%",
                      height: barHeight,
                      backgroundColor: color,
                      borderTopLeftRadius: radius.sm,
                      borderTopRightRadius: radius.sm,
                    }}
                  />
                </View>

                <Text
                  numberOfLines={2}
                  style={{
                    width: "100%",
                    minHeight: 34,
                    marginTop: 7,
                    fontFamily: typography.caption.fontFamily,
                    fontSize: Math.max(
                      10,
                      typography.caption.fontSize - 1,
                    ),
                    lineHeight: 14,
                    color: colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>

        <Text
          style={{
            marginTop: spacing.sm,
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          Number of students
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={rows
        .map((item) => `${item.label}: ${item.value}`)
        .join(", ")}
    >
      {rows.map((item) => {
        const percentage = Math.round((item.value / max) * 100);
        const barPercentage = Math.max(4, percentage);

        return (
          <View
            key={item.label}
            style={{
              marginBottom: spacing.md,
            }}
            accessible
            accessibilityLabel={`${item.label}: ${item.value}`}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 5,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  paddingRight: spacing.sm,
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  lineHeight: 18,
                  color: colors.text,
                }}
              >
                {item.label}
              </Text>

              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                  minWidth: 28,
                  textAlign: "right",
                }}
              >
                {item.value}
              </Text>
            </View>

            <View
              style={{
                height: 12,
                width: "100%",
                overflow: "hidden",
                borderRadius: radius.round,
                backgroundColor: colors.secondaryBackground,
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${barPercentage}%`,
                  backgroundColor: color,
                  borderRadius: radius.round,
                }}
              />
            </View>

            <Text
              style={{
                marginTop: 3,
                fontFamily: typography.caption.fontFamily,
                fontSize: Math.max(
                  10,
                  typography.caption.fontSize - 2,
                ),
                color: colors.textSecondary,
                textAlign: "right",
              }}
            >
              {percentage}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}