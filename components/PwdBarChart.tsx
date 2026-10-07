// components/PwdBarChart.tsx
// Simple View-based bar chart (no chart library).
// Every bar shows its label and value as text, not only color.
// Each bar gets its own color from a colorblind-safe palette (Okabe-Ito).
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../context/ThemeContext";

export interface PwdBarDatum {
  label: string;
  value: number;
}

// Okabe-Ito colorblind-safe palette (works in light and dark mode)
export const PWD_PALETTE = [
  "#0072B2", // blue
  "#E69F00", // orange
  "#009E73", // green
  "#D55E00", // vermillion
  "#56B4E9", // sky blue
  "#CC79A7", // pink
  "#6A3D9A", // purple
  "#8C8C8C", // gray
];

interface PwdBarChartProps {
  data: PwdBarDatum[];
  orientation?: "vertical" | "horizontal";
  /** Used only when multiColor is false. */
  color?: string;
  /** Give every bar a different color (default: true). */
  multiColor?: boolean;
  emptyText?: string;
  barAreaHeight?: number;
}

export default function PwdBarChart({
  data,
  orientation = "vertical",
  color,
  multiColor = true,
  emptyText = "No data yet",
  barAreaHeight = 140,
}: PwdBarChartProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const max = Math.max(0, ...data.map((d) => d.value));
  const isEmpty = data.length === 0 || max === 0;

  const captionStyle = {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  };

  if (isEmpty) {
    return (
      <Text style={[captionStyle, { fontStyle: "italic" }]}>{emptyText}</Text>
    );
  }

  const summary = data.map((d) => `${d.label}: ${d.value}`).join(", ");

  const barColor = (index: number) =>
    multiColor || !color ? PWD_PALETTE[index % PWD_PALETTE.length] : color;

  if (orientation === "horizontal") {
    return (
      <View accessible accessibilityLabel={summary}>
        {data.map((d, index) => {
          const pct =
            d.value > 0 ? Math.max(4, Math.round((d.value / max) * 100)) : 0;

          return (
            <View key={d.label} style={{ marginBottom: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingRight: 8,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      backgroundColor: barColor(index),
                      marginRight: 6,
                    }}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      fontFamily: typography.caption.fontFamily,
                      fontSize: typography.caption.fontSize,
                      color: colors.text,
                    }}
                  >
                    {d.label}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {d.value}
                </Text>
              </View>

              <View
                style={{
                  height: 10,
                  width: "100%",
                  overflow: "hidden",
                  borderRadius: radius.round,
                  backgroundColor: colors.secondaryBackground,
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    backgroundColor: barColor(index),
                    borderRadius: radius.round,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // Vertical columns
  return (
    <View
      accessible
      accessibilityLabel={summary}
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: spacing.sm,
      }}
    >
      {data.map((d, index) => {
        const height =
          d.value > 0 ? Math.max(6, (d.value / max) * barAreaHeight) : 3;

        return (
          <View key={d.label} style={styles.column}>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                fontWeight: "700",
                color: colors.text,
                marginBottom: 4,
              }}
            >
              {d.value}
            </Text>

            <View style={{ height: barAreaHeight, justifyContent: "flex-end" }}>
              <View
                style={{
                  width: 34,
                  height,
                  borderTopLeftRadius: radius.sm,
                  borderTopRightRadius: radius.sm,
                  backgroundColor: barColor(index),
                }}
              />
            </View>

            <Text
              numberOfLines={2}
              style={[
                captionStyle,
                { marginTop: 6, fontSize: 11, textAlign: "center" },
              ]}
            >
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    alignItems: "center",
  },
});
