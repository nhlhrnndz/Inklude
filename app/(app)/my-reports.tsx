// app/(app)/my-reports.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../context/ThemeContext";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";
import {
    AccessibilityReport,
    formatReportDate,
    getMyReports,
    REPORT_STATUS_LABEL,
    reportPhotoSource,
    reportStatusColor,
} from "../../utils/reportApi";

export default function MyReportsScreen() {
  const router = useRouter();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const { colors, typography, spacing, radius } = useTheme();

  const [reports, setReports] = useState<AccessibilityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const load = useCallback(async (showErrors = false) => {
    try {
      const res = await getMyReports();
      setReports(res.reports ?? []);
    } catch (err: any) {
      if (showErrors) {
        Toast.show({
          type: "error",
          text1: "Failed to load reports",
          text2: err.response?.data?.message ?? "Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  // Refreshes on focus, when a report notification arrives, and every 20s.
  useLiveRefresh(() => load(false), {
    sourceType: "accessibility_report",
    intervalMs: 20000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const captionStyle = {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  };

  const bodyStyle = {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.text,
  };

  const renderItem = ({ item }: { item: AccessibilityReport }) => {
    const color = reportStatusColor(item.status, colors);
    const photo = reportPhotoSource(item.photoUrl);
    const isHighlighted = highlight === String(item.id);

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: isHighlighted ? colors.primary : colors.border,
          borderWidth: isHighlighted ? 2 : 1,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={[bodyStyle, { fontWeight: "700" }]}>
              {item.category}
            </Text>
            <Text style={[captionStyle, { marginTop: 1 }]}>
              {item.location} • {formatReportDate(item.createdAt)}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: color + "22",
              borderColor: color,
              borderWidth: 1,
              borderRadius: radius.round,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              {REPORT_STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>

        <Text style={[bodyStyle, { marginTop: spacing.sm }]}>
          {item.description}
        </Text>

        {!!photo && (
          <TouchableOpacity
            onPress={() => setViewPhoto(photo)}
            accessibilityRole="button"
            accessibilityLabel="View photo"
            style={{ marginTop: spacing.sm, alignSelf: "flex-start" }}
          >
            <Image
              source={{ uri: photo }}
              style={{
                width: 120,
                height: 90,
                borderRadius: radius.md,
                backgroundColor: colors.secondaryBackground,
              }}
            />
          </TouchableOpacity>
        )}

        {!!item.response && (
          <View
            style={{
              marginTop: spacing.sm,
              backgroundColor: colors.secondaryBackground,
              borderRadius: radius.md,
              padding: spacing.sm + 2,
            }}
          >
            <Text style={[captionStyle, { fontWeight: "700" }]}>
              Guidance response
            </Text>
            <Text style={[bodyStyle, { marginTop: 2 }]}>{item.response}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm + 4,
          paddingBottom: spacing.sm,
        }}
      >
        <Text
          style={{
            fontFamily: typography.h2.fontFamily,
            fontSize: typography.h2.fontSize,
            fontWeight: typography.h2.fontWeight,
            color: colors.text,
          }}
          accessibilityRole="header"
        >
          My Reports
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/report-issue" as any)}
          accessibilityRole="button"
          accessibilityLabel="Report a new issue"
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.primary,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            gap: 6,
          }}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading reports"
        />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 40,
          }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View
              style={{
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                padding: spacing.lg,
              }}
            >
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  bodyStyle,
                  { fontWeight: "700", marginTop: spacing.sm },
                ]}
              >
                No reports yet
              </Text>
              <Text
                style={[captionStyle, { textAlign: "center", marginTop: 4 }]}
              >
                When you report a barrier, you can follow its progress here.
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={!!viewPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setViewPhoto(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
          }}
        >
          {!!viewPhoto && (
            <Image
              source={{ uri: viewPhoto }}
              style={{ width: "100%", height: "80%" }}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            onPress={() => setViewPhoto(null)}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            style={{ position: "absolute", top: 48, right: 20, padding: 8 }}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
