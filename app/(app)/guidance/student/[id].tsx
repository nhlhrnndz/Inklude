import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useAuth } from "../../../../context/AuthContext";
import { useTheme } from "../../../../context/ThemeContext";
import {
  getGuidanceStudentSIS,
  getStudentDetail,
  SISData,
  SISStatus,
} from "../../../../utils/api";

type StudentDetail = {
  student: {
    id: number;
    name: string;
    email: string;
    createdAt: string;
    disabilityTypes: string[];
    accessibilityPreferences: Record<string, boolean>;
  };
  attendance: {
    sessionId: number;
    sessionCode: string;
    title: string;
    status: string;
    teacherName: string;
    joinedAt: string;
    leftAt: string | null;
  }[];
  transcripts: {
    id: number;
    text: string;
    createdAt: string;
    sessionTitle: string;
    sessionCode: string;
  }[];
};

type SISResponse = {
  sis: SISData | null;
  status: SISStatus;
};

const ROLE_HOME: Record<string, string> = {
  student: "/student",
  teacher: "/teacher",
  guidance: "/guidance-dashboard",
};

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [data, setData] = useState<StudentDetail | null>(null);
  const [sisData, setSisData] = useState<SISData | null>(null);
  const [sisStatus, setSisStatus] = useState<SISStatus>("not_started");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const studentId = Number(id);

        const [studentRes, sisRes] = await Promise.all([
          getStudentDetail(studentId),
          getGuidanceStudentSIS(studentId),
        ]);

        setData(studentRes);

        const normalizedSIS: SISResponse = sisRes;

        setSisData(normalizedSIS.sis ?? null);
        setSisStatus(normalizedSIS.status ?? "not_started");
      } catch (err: any) {
        Toast.show({
          type: "error",
          text1: "Failed to load student",
          text2: err.response?.data?.message ?? "Please try again.",
        });

        router.back();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const goToDashboard = () => {
    router.replace(
      (ROLE_HOME[user?.role ?? "guidance"] ?? "/") as any
    );
  };

  const getSISStatusLabel = (status: SISStatus) => {
    switch (status) {
      case "completed":
        return "Completed";

      case "in_progress":
        return "In Progress";

      case "not_started":
      default:
        return "Not Started";
    }
  };

  const getSISStatusIcon = (status: SISStatus) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";

      case "in_progress":
        return "time-outline";

      case "not_started":
      default:
        return "ellipse-outline";
    }
  };

  const getSISStatusColors = (status: SISStatus) => {
    switch (status) {
      case "completed":
        return {
          background: colors.success + "18",
          border: colors.success,
          text: colors.success,
        };

      case "in_progress":
        return {
          background: colors.warning + "18",
          border: colors.warning,
          text: colors.warning,
        };

      case "not_started":
      default:
        return {
          background: colors.secondaryBackground,
          border: colors.border,
          text: colors.textSecondary,
        };
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) {
      return "Not provided";
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString();
  };

  const renderInfoRow = (
    label: string,
    value?: string | null,
    multiline = false
  ) => {
    const displayValue =
      value && value.trim().length > 0 ? value : "Not provided";

    return (
      <View
        style={[
          styles.infoRow,
          {
            borderBottomColor: colors.border,
            paddingVertical: spacing.sm + 2,
          },
        ]}
      >
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginBottom: multiline ? 4 : 0,
            flex: multiline ? undefined : 0.42,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color:
              displayValue === "Not provided"
                ? colors.placeholder
                : colors.text,
            fontStyle:
              displayValue === "Not provided" ? "italic" : "normal",
            flex: multiline ? undefined : 0.58,
            textAlign: multiline ? "left" : "right",
            lineHeight: 20,
          }}
        >
          {displayValue}
        </Text>
      </View>
    );
  };

  const renderSISSection = (
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    children: React.ReactNode
  ) => (
    <View
      style={[
        styles.sisSection,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          marginBottom: spacing.md,
        },
      ]}
    >
      <View
        style={[
          styles.sisSectionHeader,
          {
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 2,
          },
        ]}
      >
        <View style={styles.sisSectionTitleRow}>
          <Ionicons
            name={icon}
            size={19}
            color={colors.primary}
          />

          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              fontWeight: "700",
              color: colors.text,
              marginLeft: 8,
            }}
          >
            {title}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.md }}>
        {children}
      </View>
    </View>
  );

  if (loading || !data) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading student details"
        />
      </SafeAreaView>
    );
  }

  const { student, attendance, transcripts } = data;

  const sisStatusColors = getSISStatusColors(sisStatus);

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: 60,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity
          onPress={goToDashboard}
          style={[
            styles.backBtn,
            {
              marginBottom: spacing.md,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back to dashboard"
          hitSlop={8}
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color={colors.primary}
          />

          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              color: colors.primary,
              fontWeight: "600",
              fontSize: typography.body.fontSize,
              marginLeft: 6,
            }}
          >
            Back to Dashboard
          </Text>
        </TouchableOpacity>

        {/* Student Profile */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.secondaryBackground,
              borderRadius: radius.lg,
              borderColor: colors.border,
              paddingVertical: spacing.xl,
              marginBottom: spacing.lg,
            },
          ]}
          accessibilityLabel={`${student.name}, ${student.email}`}
        >
          <View
            style={[
              styles.avatar,
              {
                borderRadius: radius.round,
                backgroundColor: colors.primary,
                marginBottom: spacing.sm,
              },
            ]}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "700",
                fontFamily: typography.h2.fontFamily,
                fontSize: typography.h2.fontSize,
              }}
            >
              {student.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: typography.title.fontSize,
              fontWeight: "700",
              color: colors.text,
            }}
            accessibilityRole="header"
          >
            {student.name}
          </Text>

          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginTop: 2,
              marginBottom: 12,
            }}
          >
            {student.email}
          </Text>

          <View
            style={[
              styles.tagRow,
              {
                gap: 6,
                paddingHorizontal: 16,
              },
            ]}
          >
            {student.disabilityTypes.length > 0 ? (
              student.disabilityTypes.map((type) => (
                <View
                  key={type}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: colors.primaryLight + "1A",
                      borderRadius: radius.sm,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.primary,
                      fontWeight: "600",
                    }}
                  >
                    {type}
                  </Text>
                </View>
              ))
            ) : (
              <Text
                style={{
                  fontSize: typography.caption.fontSize,
                  color: colors.placeholder,
                  fontStyle: "italic",
                }}
              >
                No profile submitted
              </Text>
            )}
          </View>
        </View>

        {/* SIS Status */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              fontWeight: "700",
              color: colors.text,
              marginBottom: spacing.sm + 2,
            }}
            accessibilityRole="header"
          >
            Student Information Sheet
          </Text>

          <View
            style={[
              styles.sisStatusCard,
              {
                backgroundColor: sisStatusColors.background,
                borderColor: sisStatusColors.border,
                borderRadius: radius.md,
                padding: spacing.md,
              },
            ]}
            accessibilityLabel={`Student Information Sheet status: ${getSISStatusLabel(
              sisStatus
            )}`}
          >
            <View style={styles.sisStatusIcon}>
              <Ionicons
                name={getSISStatusIcon(sisStatus) as any}
                size={28}
                color={sisStatusColors.text}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {getSISStatusLabel(sisStatus)}
              </Text>

              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginTop: 3,
                  lineHeight: 18,
                }}
              >
                {sisStatus === "completed"
                  ? "The student's Student Information Sheet has been completed."
                  : sisStatus === "in_progress"
                    ? "The student has started the Student Information Sheet but has not completed it yet."
                    : "The student has not started the Student Information Sheet yet."}
              </Text>
            </View>
          </View>
        </View>

        {/* SIS Details */}
        {sisData && (
          <View style={{ marginBottom: spacing.lg }}>
            {renderSISSection(
              "Personal Information",
              "person-outline",
              <>
                {renderInfoRow("Student ID", sisData.studentId)}
                {renderInfoRow("Full Name", sisData.fullName)}
                {renderInfoRow(
                  "Date of Birth",
                  formatDate(sisData.dateOfBirth)
                )}
                {renderInfoRow("Sex", sisData.sex)}
                {renderInfoRow(
                  "Civil Status",
                  sisData.civilStatus
                )}
                {renderInfoRow(
                  "Nationality",
                  sisData.nationality
                )}
              </>
            )}

            {renderSISSection(
              "Contact Information",
              "call-outline",
              <>
                {renderInfoRow("Email", sisData.email)}
                {renderInfoRow(
                  "Mobile Number",
                  sisData.mobileNumber
                )}
                {renderInfoRow(
                  "Current Address",
                  sisData.currentAddress,
                  true
                )}
                {renderInfoRow(
                  "Permanent Address",
                  sisData.permanentAddress,
                  true
                )}
              </>
            )}

            {renderSISSection(
              "Academic Information",
              "school-outline",
              <>
                {renderInfoRow(
                  "Program / Course",
                  sisData.programCourse
                )}
                {renderInfoRow(
                  "Year Level",
                  sisData.yearLevel
                )}
                {renderInfoRow(
                  "Section / Block",
                  sisData.sectionBlock
                )}
                {renderInfoRow(
                  "Academic Year",
                  sisData.academicYear
                )}
              </>
            )}

            {renderSISSection(
              "Emergency Contact",
              "alert-circle-outline",
              <>
                {renderInfoRow(
                  "Name",
                  sisData.emergencyContactName
                )}
                {renderInfoRow(
                  "Relationship",
                  sisData.emergencyContactRelationship
                )}
                {renderInfoRow(
                  "Contact Number",
                  sisData.emergencyContactNumber
                )}
                {renderInfoRow(
                  "Address",
                  sisData.emergencyContactAddress,
                  true
                )}
              </>
            )}

            {renderSISSection(
              "Parent / Guardian",
              "people-outline",
              <>
                {renderInfoRow(
                  "Name",
                  sisData.parentGuardianName
                )}
                {renderInfoRow(
                  "Relationship",
                  sisData.parentGuardianRelationship
                )}
                {renderInfoRow(
                  "Contact",
                  sisData.parentGuardianContact
                )}
                {renderInfoRow(
                  "Occupation",
                  sisData.parentGuardianOccupation
                )}
              </>
            )}

            {renderSISSection(
              "Communication & Support",
              "chatbubble-ellipses-outline",
              <>
                {renderInfoRow(
                  "Preferred Communication",
                  sisData.preferredCommunicationMethod
                )}
                {renderInfoRow(
                  "Learning / Communication Preferences",
                  sisData.learningCommunicationPreferences,
                  true
                )}
                {renderInfoRow(
                  "Additional Support Notes",
                  sisData.additionalSupportNotes,
                  true
                )}
              </>
            )}

            <View
              style={[
                styles.lastUpdatedCard,
                {
                  backgroundColor: colors.secondaryBackground,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                },
              ]}
            >
              <View style={styles.lastUpdatedRow}>
                <Ionicons
                  name="time-outline"
                  size={17}
                  color={colors.textSecondary}
                />

                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.textSecondary,
                    marginLeft: 7,
                  }}
                >
                  Last updated
                </Text>
              </View>

              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.text,
                  fontWeight: "600",
                  marginTop: 5,
                }}
              >
                {formatDate(sisData.updatedAt)}
              </Text>
            </View>
          </View>
        )}

        {/* Accessibility Preferences */}
        {Object.keys(student.accessibilityPreferences).length > 0 && (
          <View style={{ marginBottom: spacing.xl }}>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                fontWeight: "700",
                color: colors.text,
                marginBottom: spacing.sm + 2,
              }}
              accessibilityRole="header"
            >
              Accessibility Preferences
            </Text>

            <View style={[styles.prefGrid, { gap: 8 }]}>
              {Object.entries(
                student.accessibilityPreferences
              ).map(([key, value]) => (
                <View
                  key={key}
                  style={[
                    styles.prefChip,
                    {
                      borderRadius: radius.sm,
                      backgroundColor: value
                        ? colors.success + "1A"
                        : colors.secondaryBackground,
                      borderColor: value
                        ? colors.success
                        : colors.border,
                    },
                  ]}
                  accessibilityLabel={`${key}: ${
                    value ? "on" : "off"
                  }`}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: value
                        ? colors.success
                        : colors.textSecondary,
                    }}
                  >
                    {key} {value ? "✓" : "✕"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Session Attendance */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              fontWeight: "700",
              color: colors.text,
              marginBottom: spacing.sm + 2,
            }}
            accessibilityRole="header"
          >
            Session Attendance ({attendance.length})
          </Text>

          {attendance.length === 0 ? (
            <Text
              style={{
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                fontStyle: "italic",
              }}
            >
              No sessions attended yet.
            </Text>
          ) : (
            attendance.map((a) => (
              <View
                key={`${a.sessionId}-${a.joinedAt}`}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.sm + 2,
                    padding: 12,
                    marginBottom: 8,
                  },
                ]}
                accessibilityLabel={`${a.title}, taught by ${
                  a.teacherName
                }, status ${a.status}, joined ${new Date(
                  a.joinedAt
                ).toLocaleString()}`}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: typography.body.fontSize,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {a.title}
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    Teacher: {a.teacherName} • Code:{" "}
                    {a.sessionCode}
                  </Text>

                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.placeholder,
                      marginTop: 4,
                    }}
                  >
                    Joined:{" "}
                    {new Date(a.joinedAt).toLocaleString()}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      borderRadius: radius.sm,
                      backgroundColor:
                        a.status === "active"
                          ? colors.success + "1A"
                          : colors.secondaryBackground,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: colors.text,
                      textTransform: "capitalize",
                    }}
                  >
                    {a.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Transcript History */}
        <View>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              fontWeight: "700",
              color: colors.text,
              marginBottom: spacing.sm + 2,
            }}
            accessibilityRole="header"
          >
            Caption Transcript History ({transcripts.length})
          </Text>

          {transcripts.length === 0 ? (
            <Text
              style={{
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                fontStyle: "italic",
              }}
            >
              No transcripts yet.
            </Text>
          ) : (
            transcripts.map((t) => (
              <View
                key={t.id}
                style={[
                  styles.transcriptRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.sm + 2,
                    padding: 12,
                    marginBottom: 8,
                  },
                ]}
                accessibilityLabel={`Transcript from ${
                  t.sessionTitle
                }, ${new Date(t.createdAt).toLocaleString()}: ${
                  t.text
                }`}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.primary,
                    marginBottom: 4,
                  }}
                >
                  {t.sessionTitle} • {t.sessionCode}
                </Text>

                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.text,
                    lineHeight: 18,
                  }}
                >
                  {t.text}
                </Text>

                <Text
                  style={{
                    fontSize: 11,
                    color: colors.placeholder,
                    marginTop: 4,
                  }}
                >
                  {new Date(t.createdAt).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },

  profileCard: {
    alignItems: "center",
    borderWidth: 1,
  },

  avatar: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },

  sisStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },

  sisStatusIcon: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  sisSection: {
    borderWidth: 1,
    overflow: "hidden",
  },

  sisSectionHeader: {
    borderBottomWidth: 1,
  },

  sisSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },

  lastUpdatedCard: {
    borderWidth: 1,
  },

  lastUpdatedRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  prefGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  prefChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },

  row: {
    flexDirection: "row",
    borderWidth: 1,
    alignItems: "center",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  transcriptRow: {
    borderWidth: 1,
  },
});