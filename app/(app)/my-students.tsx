// app/(app)/my-students.tsx — Teacher: students in my classes
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import TeacherReferralModal from "../../components/TeacherReferralModal";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
    SentReferral,
    TeacherStudent,
    getMyStudents,
    getSentReferrals,
} from "../../utils/classApi";

export default function MyStudentsScreen() {
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const [sent, setSent] = useState<SentReferral[]>([]);
  const [referTarget, setReferTarget] = useState<TeacherStudent | null>(null);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<number | null>(null);
  const [ascending, setAscending] = useState(true);

  const load = useCallback(async () => {
    try {
      const [res, sentRes] = await Promise.all([
        getMyStudents(),
        getSentReferrals().catch(() => ({ referrals: [] as SentReferral[] })),
      ]);
      setStudents(res.students);
      setSent(sentRes.referrals);
      setError(false);
    } catch (err: any) {
      setError(true);
      Toast.show({
        type: "error",
        text1: "Could not load students",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // The unique classes across all students, for the filter chips
  const classOptions = useMemo(() => {
    const map = new Map<number, string>();
    students.forEach((s) => s.classes.forEach((c) => map.set(c.id, c.title)));
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [students]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = students.filter((s) => {
      if (
        classFilter !== null &&
        !s.classes.some((c) => c.id === classFilter)
      ) {
        return false;
      }
      if (q && !s.displayName.toLowerCase().includes(q)) return false;
      return true;
    });
    list.sort((a, b) =>
      ascending
        ? a.displayName.localeCompare(b.displayName)
        : b.displayName.localeCompare(a.displayName),
    );
    return list;
  }, [students, search, classFilter, ascending]);

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

  if (user?.role !== "teacher") {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <Text style={[bodyStyle, { textAlign: "center", marginTop: 60 }]}>
          This page is for teachers.
        </Text>
      </SafeAreaView>
    );
  }

  // Latest referral per student (list is already newest first)
  const latestByStudent = useMemo(() => {
    const map = new Map<number, SentReferral>();
    sent.forEach((r) => {
      if (!map.has(r.studentId)) map.set(r.studentId, r);
    });
    return map;
  }, [sent]);

  const STATUS_TEXT = {
    sent: "Referred · Sent",
    acknowledged: "Referred · Acknowledged",
    completed: "Referred · Completed",
  } as const;

  const renderChip = (
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
        minHeight: 40,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.surface,
        borderRadius: radius.xl,
        paddingHorizontal: spacing.md,
        marginRight: 8,
      }}
    >
      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          fontWeight: "700",
          color: active ? "#FFFFFF" : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: TeacherStudent }) => (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
      }}
      accessible
      accessibilityLabel={`${item.displayName}. ${item.classes
        .map((c) => c.title)
        .join(", ")}. ${
        item.hasAccommodationRequest
          ? "Has an accommodation request."
          : "No accommodation request."
      }`}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: item.avatarColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
          {item.initials}
        </Text>
      </View>

      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={[bodyStyle, { fontWeight: "700" }]} numberOfLines={1}>
          {item.displayName}
        </Text>
        <Text style={[captionStyle, { marginTop: 2 }]} numberOfLines={2}>
          {item.classes.map((c) => c.title).join(" • ")}
        </Text>
      </View>

      {item.hasAccommodationRequest && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.warning + "22",
            borderColor: colors.warning,
            borderWidth: 1,
            borderRadius: radius.sm,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Ionicons
            name="accessibility-outline"
            size={14}
            color={colors.text}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: colors.text,
              marginLeft: 4,
            }}
          >
            Request
          </Text>
        </View>
      )}

      <View
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          marginTop: spacing.sm,
        }}
      >
        {latestByStudent.get(item.id) && (
          <Text style={[captionStyle, { flex: 1, fontWeight: "700" }]}>
            {STATUS_TEXT[latestByStudent.get(item.id)!.status]}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => setReferTarget(item)}
          accessibilityRole="button"
          accessibilityLabel={`Refer ${item.displayName} to Guidance`}
          style={{
            marginLeft: "auto",
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          }}
        >
          <Ionicons name="hand-left-outline" size={16} color={colors.primary} />
          <Text
            style={{ marginLeft: 6, fontWeight: "700", color: colors.primary }}
          >
            Refer to Guidance
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["left", "right", "bottom"]}
    >
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        }}
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
          Students
        </Text>
        <Text style={[captionStyle, { marginTop: 2 }]}>
          Students enrolled in your classes. Support needs and personal records
          are private and are not shown here.
        </Text>

        {/* Search + sort */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: spacing.md,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              paddingHorizontal: spacing.sm + 2,
            }}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={{
                flex: 1,
                minHeight: 46,
                marginLeft: 8,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
              }}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name"
              placeholderTextColor={colors.placeholder}
              accessibilityLabel="Search students by name"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            onPress={() => setAscending((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={
              ascending
                ? "Sorted A to Z. Tap to sort Z to A"
                : "Sorted Z to A. Tap to sort A to Z"
            }
            style={{
              minWidth: 56,
              minHeight: 46,
              marginLeft: spacing.sm,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              paddingHorizontal: 10,
            }}
          >
            <Ionicons
              name={ascending ? "arrow-down" : "arrow-up"}
              size={16}
              color={colors.primary}
            />
            <Text
              style={{
                marginLeft: 4,
                fontWeight: "700",
                color: colors.primary,
              }}
            >
              {ascending ? "A–Z" : "Z–A"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Class filter */}
        {classOptions.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: spacing.sm, flexGrow: 0 }}
            contentContainerStyle={{ paddingVertical: 4 }}
          >
            {renderChip("all", "All classes", classFilter === null, () =>
              setClassFilter(null),
            )}
            {classOptions.map((c) =>
              renderChip(String(c.id), c.title, classFilter === c.id, () =>
                setClassFilter(c.id),
              ),
            )}
          </ScrollView>
        )}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading students"
        />
      ) : error && students.length === 0 ? (
        <View style={{ alignItems: "center", padding: spacing.lg }}>
          <Ionicons
            name="cloud-offline-outline"
            size={28}
            color={colors.textSecondary}
          />
          <Text
            style={[bodyStyle, { marginTop: spacing.sm, textAlign: "center" }]}
          >
            We couldn't load your students.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              load();
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            style={{
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              marginTop: spacing.md,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(s) => String(s.id)}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: 40,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: spacing.xl }}>
              <Ionicons
                name="people-outline"
                size={36}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  bodyStyle,
                  { marginTop: spacing.sm, textAlign: "center" },
                ]}
              >
                {students.length === 0
                  ? "No students have joined your classes yet."
                  : "No students match your search."}
              </Text>
            </View>
          }
        />
      )}

      <TeacherReferralModal
        student={referTarget}
        onClose={() => setReferTarget(null)}
        onSent={(r) => setSent((prev) => [r, ...prev])}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});
