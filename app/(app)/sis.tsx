//sis.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ScreenContainer from "../../components/common/ScreenContainer";
import { useTheme } from "../../context/ThemeContext";
import {
  getMySIS,
  saveMySIS,
  updateMySIS,
  type SISData,
  type SISStatus,
} from "../../utils/api";

type SectionKey =
  | "student"
  | "contact"
  | "academic"
  | "emergency"
  | "family"
  | "support";

type BasicInfo = {
  yearLevel?: string;
  age?: number;
  dateOfBirth?: string;
  course?: string;
  section?: string;
};

const createEmptyForm = (): SISData => ({
  studentId: "",
  fullName: "",
  dateOfBirth: "",
  sex: "",
  civilStatus: "",
  nationality: "",
  email: "",
  mobileNumber: "",
  currentAddress: "",
  permanentAddress: "",
  programCourse: "",
  yearLevel: "",
  sectionBlock: "",
  academicYear: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactNumber: "",
  emergencyContactAddress: "",
  parentGuardianName: "",
  parentGuardianRelationship: "",
  parentGuardianContact: "",
  parentGuardianOccupation: "",
  preferredCommunicationMethod: "",
  learningCommunicationPreferences: "",
  additionalSupportNotes: "",
  status: "not_started",
});

const normalizeSIS = (sis: SISData | null, status: SISStatus): SISData => {
  const empty = createEmptyForm();

  if (!sis) {
    return {
      ...empty,
      status,
    };
  }

  return {
    ...empty,
    ...sis,
    status,
    studentId: sis.studentId ?? "",
    fullName: sis.fullName ?? "",
    dateOfBirth: sis.dateOfBirth ?? "",
    sex: sis.sex ?? "",
    civilStatus: sis.civilStatus ?? "",
    nationality: sis.nationality ?? "",
    email: sis.email ?? "",
    mobileNumber: sis.mobileNumber ?? "",
    currentAddress: sis.currentAddress ?? "",
    permanentAddress: sis.permanentAddress ?? "",
    programCourse: sis.programCourse ?? "",
    yearLevel: sis.yearLevel ?? "",
    sectionBlock: sis.sectionBlock ?? "",
    academicYear: sis.academicYear ?? "",
    emergencyContactName: sis.emergencyContactName ?? "",
    emergencyContactRelationship: sis.emergencyContactRelationship ?? "",
    emergencyContactNumber: sis.emergencyContactNumber ?? "",
    emergencyContactAddress: sis.emergencyContactAddress ?? "",
    parentGuardianName: sis.parentGuardianName ?? "",
    parentGuardianRelationship: sis.parentGuardianRelationship ?? "",
    parentGuardianContact: sis.parentGuardianContact ?? "",
    parentGuardianOccupation: sis.parentGuardianOccupation ?? "",
    preferredCommunicationMethod: sis.preferredCommunicationMethod ?? "",
    learningCommunicationPreferences:
      sis.learningCommunicationPreferences ?? "",
    additionalSupportNotes: sis.additionalSupportNotes ?? "",
  };
};

const REQUIRED_FIELDS: Array<{
  key: keyof SISData;
  label: string;
}> = [
  {
    key: "fullName",
    label: "Full Name",
  },
];

const SECTION_LABELS: Record<SectionKey, string> = {
  student: "Student Information",
  contact: "Contact Information",
  academic: "Academic Information",
  emergency: "Emergency Contact",
  family: "Family / Household",
  support: "Student Support",
};

export default function SISScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  const [form, setForm] = useState<SISData>(createEmptyForm());
  const [lastSavedForm, setLastSavedForm] =
    useState<SISData>(createEmptyForm());

  const [basicInfo, setBasicInfo] = useState<BasicInfo | null>(null);

  const [currentStatus, setCurrentStatus] = useState<SISStatus>("not_started");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [openSection, setOpenSection] = useState<SectionKey | null>("student");

  const [editingCompleted, setEditingCompleted] = useState(false);

  const [introVisible, setIntroVisible] = useState(true);

  useEffect(() => {
    loadSIS();
  }, []);

  const loadSIS = async () => {
    try {
      setLoading(true);

      const response = await getMySIS();

      const loadedStatus: SISStatus =
        response.status ?? response.sis?.status ?? "not_started";

      const normalized = normalizeSIS(response.sis, loadedStatus);

      setForm(normalized);
      setLastSavedForm(normalized);
      setCurrentStatus(loadedStatus);
      setBasicInfo(response.basicInfo ?? null);

      if (loadedStatus === "completed") {
        setIntroVisible(false);
        setEditingCompleted(false);
      } else if (loadedStatus === "in_progress") {
        setIntroVisible(false);
        setEditingCompleted(true);
      } else {
        setIntroVisible(true);
        setEditingCompleted(true);
      }
    } catch (error) {
      console.error("Failed to load SIS:", error);

      Alert.alert(
        "Unable to load SIS",
        "We could not load your Student Information Sheet. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof SISData>(key: K, value: SISData[K]) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(lastSavedForm);
  }, [form, lastSavedForm]);

  const missingRequiredFields = useMemo(() => {
    return REQUIRED_FIELDS.filter(({ key }) => {
      const value = form[key];

      return typeof value !== "string" || value.trim().length === 0;
    });
  }, [form]);

  const isCompletedReview = currentStatus === "completed" && !editingCompleted;

  const isCompletedEditing = currentStatus === "completed" && editingCompleted;

  const canEdit = currentStatus !== "completed" || editingCompleted;

  const toggleSection = (section: SectionKey) => {
    setOpenSection((previous) => (previous === section ? null : section));
  };

  const goToStudentDashboard = () => {
    router.replace("/student");
  };

  const startSIS = () => {
    setIntroVisible(false);
    setEditingCompleted(true);
    setOpenSection("student");
  };

  const enterCompletedEditMode = () => {
    setEditingCompleted(true);
    setOpenSection("student");
  };

  const cancelCompletedEdit = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Discard changes?",
        "Your last saved SIS information will remain unchanged.",
        [
          {
            text: "Continue Editing",
            style: "cancel",
          },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setForm({
                ...lastSavedForm,
              });

              setEditingCompleted(false);
              setCurrentStatus("completed");
              setOpenSection("student");
            },
          },
        ],
      );

      return;
    }

    setEditingCompleted(false);
    setCurrentStatus("completed");
    setForm({
      ...lastSavedForm,
    });
  };

  const validateForCompletion = () => {
    if (missingRequiredFields.length === 0) {
      return true;
    }

    const missingNames = missingRequiredFields
      .map((item) => item.label)
      .join(", ");

    Alert.alert("Information still needed", `Please provide: ${missingNames}.`);

    setOpenSection("student");

    return false;
  };

  const save = async (targetStatus: SISStatus) => {
    if (saving) {
      return;
    }

    if (currentStatus === "completed" && targetStatus === "in_progress") {
      return;
    }

    if (targetStatus === "completed") {
      const valid = validateForCompletion();

      if (!valid) {
        return;
      }
    }

    try {
      setSaving(true);

      const payload: SISData = {
        ...form,
        status: targetStatus,
      };

      const response =
        currentStatus === "not_started"
          ? await saveMySIS(payload)
          : await updateMySIS(payload);

      const saved = normalizeSIS(response.sis ?? payload, targetStatus);

      setForm(saved);
      setLastSavedForm(saved);
      setCurrentStatus(targetStatus);
      setBasicInfo(response.basicInfo ?? basicInfo);

      if (targetStatus === "completed") {
        setEditingCompleted(false);
      } else {
        setEditingCompleted(true);
      }

      if (targetStatus === "completed") {
        Alert.alert(
          "SIS completed",
          "Your Student Information Sheet has been completed successfully.",
          [
            {
              text: "Done",
              onPress: () => {
                goToStudentDashboard();
              },
            },
          ],
        );
      } else {
        Alert.alert(
          "Progress saved",
          "Your SIS information has been saved. You can continue completing it later.",
        );
      }
    } catch (error) {
      console.error("Failed to save SIS:", error);

      Alert.alert(
        "Unable to save",
        "We could not save your Student Information Sheet. Please check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const skipForNow = () => {
    if (saving) {
      return;
    }

    if (currentStatus === "completed") {
      return;
    }

    if (currentStatus === "not_started") {
      router.replace("/student");
      return;
    }

    if (currentStatus === "in_progress") {
      if (!hasUnsavedChanges) {
        router.replace("/student");
        return;
      }

      Alert.alert(
        "Leave without saving?",
        "Your previously saved SIS information will remain available. Any changes made since your last save will be discarded.",
        [
          {
            text: "Continue Editing",
            style: "cancel",
          },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => {
              setForm({ ...lastSavedForm });
              router.replace("/student");
            },
          },
        ],
      );
    }
  };

  const handleBack = () => {
    if (saving) {
      return;
    }

    if (currentStatus === "completed" && editingCompleted) {
      cancelCompletedEdit();
      return;
    }

    goToStudentDashboard();
  };

  const renderTextInput = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    options?: {
      placeholder?: string;
      multiline?: boolean;
      keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
      editable?: boolean;
    },
  ) => {
    const editable = options?.editable ?? canEdit;

    return (
      <View style={styles.fieldContainer}>
        <Text
          style={[
            typography.body,
            styles.fieldLabel,
            {
              color: colors.text,
            },
          ]}
        >
          {label}
        </Text>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={options?.placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline={options?.multiline}
          keyboardType={options?.keyboardType ?? "default"}
          editable={editable}
          accessibilityLabel={label}
          style={[
            typography.body,
            styles.input,
            {
              color: colors.text,
              backgroundColor: editable ? colors.surface : colors.background,
              borderColor: colors.border,
              borderRadius: radius.md,
              minHeight: options?.multiline ? 110 : 48,
              textAlignVertical: options?.multiline ? "top" : "center",
              opacity: editable ? 1 : 0.75,
            },
          ]}
        />
      </View>
    );
  };

  const renderSectionHeader = (section: SectionKey) => {
    const isOpen = openSection === section;

    return (
      <TouchableOpacity
        onPress={() => toggleSection(section)}
        accessibilityRole="button"
        accessibilityLabel={`${SECTION_LABELS[section]} section`}
        accessibilityState={{
          expanded: isOpen,
        }}
        style={[
          styles.sectionHeader,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
          },
        ]}
      >
        <View style={styles.sectionHeaderText}>
          <Text
            style={[
              typography.body,
              styles.sectionTitle,
              {
                color: colors.text,
              },
            ]}
          >
            {SECTION_LABELS[section]}
          </Text>
        </View>

        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={22}
          color={colors.text}
        />
      </TouchableOpacity>
    );
  };

  const renderStudentSection = () => (
    <View>
      {renderTextInput(
        "Student ID",
        form.studentId,
        (value) => updateField("studentId", value),
        {
          placeholder: "Enter your student ID",
        },
      )}

      {renderTextInput(
        "Full Name",
        form.fullName,
        (value) => updateField("fullName", value),
        {
          placeholder: "Enter your full name",
        },
      )}

      {renderTextInput(
        "Date of Birth",
        basicInfo?.dateOfBirth || form.dateOfBirth,
        () => {},
        {
          placeholder: "Not set yet",
          editable: false,
        },
      )}

      <TouchableOpacity
        onPress={() => router.push("/basic-info?edit=1")}
        accessibilityRole="button"
        accessibilityLabel="Edit Date of Birth in Basic Information"
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: -8,
          marginBottom: 16,
        }}
      >
        <Ionicons name="create-outline" size={14} color={colors.primary} />
        <Text
          style={{
            fontSize: 12,
            color: colors.primary,
            fontWeight: "600",
            marginLeft: 4,
          }}
        >
          Set in Basic Information — tap to edit
        </Text>
      </TouchableOpacity>

      {renderTextInput("Sex", form.sex, (value) => updateField("sex", value), {
        placeholder: "Enter sex",
      })}

      {renderTextInput(
        "Civil Status",
        form.civilStatus,
        (value) => updateField("civilStatus", value),
        {
          placeholder: "Enter civil status",
        },
      )}

      {renderTextInput(
        "Nationality",
        form.nationality,
        (value) => updateField("nationality", value),
        {
          placeholder: "Enter nationality",
        },
      )}
    </View>
  );

  const renderContactSection = () => (
    <View>
      {renderTextInput(
        "Email",
        form.email,
        (value) => updateField("email", value),
        {
          placeholder: "Enter email address",
          keyboardType: "email-address",
        },
      )}

      {renderTextInput(
        "Mobile Number",
        form.mobileNumber,
        (value) => updateField("mobileNumber", value),
        {
          placeholder: "Enter mobile number",
          keyboardType: "phone-pad",
        },
      )}

      {renderTextInput(
        "Current Address",
        form.currentAddress,
        (value) => updateField("currentAddress", value),
        {
          placeholder: "Enter current address",
          multiline: true,
        },
      )}

      {renderTextInput(
        "Permanent Address",
        form.permanentAddress,
        (value) => updateField("permanentAddress", value),
        {
          placeholder: "Enter permanent address",
          multiline: true,
        },
      )}
    </View>
  );

  const renderAcademicSection = () => (
    <View>
      <Text
        style={{
          fontSize: 12,
          color: colors.textSecondary,
          marginBottom: 10,
          lineHeight: 17,
        }}
      >
        Program/Course, Year Level, and Section come from your Basic Information
        and stay in sync automatically.
      </Text>

      {renderTextInput(
        "Program / Course",
        basicInfo?.course || form.programCourse,
        () => {},
        {
          placeholder: "Not set yet",
          editable: false,
        },
      )}

      {renderTextInput(
        "Year Level",
        basicInfo?.yearLevel || form.yearLevel,
        () => {},
        {
          placeholder: "Not set yet",
          editable: false,
        },
      )}

      {renderTextInput(
        "Section / Block",
        basicInfo?.section || form.sectionBlock,
        () => {},
        {
          placeholder: "Not set yet",
          editable: false,
        },
      )}

      <TouchableOpacity
        onPress={() => router.push("/basic-info?edit=1")}
        accessibilityRole="button"
        accessibilityLabel="Edit in Basic Information"
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: -6,
          marginBottom: 16,
        }}
      >
        <Ionicons name="create-outline" size={16} color={colors.primary} />
        <Text
          style={{
            fontSize: 13,
            color: colors.primary,
            fontWeight: "600",
            marginLeft: 6,
          }}
        >
          Edit in Basic Information
        </Text>
      </TouchableOpacity>

      {renderTextInput(
        "Academic Year",
        form.academicYear,
        (value) => updateField("academicYear", value),
        {
          placeholder: "Example: 2026-2027",
        },
      )}
    </View>
  );

  const renderEmergencySection = () => (
    <View>
      {renderTextInput(
        "Contact Name",
        form.emergencyContactName,
        (value) => updateField("emergencyContactName", value),
        {
          placeholder: "Enter emergency contact name",
        },
      )}

      {renderTextInput(
        "Relationship",
        form.emergencyContactRelationship,
        (value) => updateField("emergencyContactRelationship", value),
        {
          placeholder: "Example: Parent, sibling, guardian",
        },
      )}

      {renderTextInput(
        "Mobile Number",
        form.emergencyContactNumber,
        (value) => updateField("emergencyContactNumber", value),
        {
          placeholder: "Enter mobile number",
          keyboardType: "phone-pad",
        },
      )}

      {renderTextInput(
        "Address",
        form.emergencyContactAddress,
        (value) => updateField("emergencyContactAddress", value),
        {
          placeholder: "Enter address",
          multiline: true,
        },
      )}
    </View>
  );

  const renderFamilySection = () => (
    <View>
      {renderTextInput(
        "Parent / Guardian Name",
        form.parentGuardianName,
        (value) => updateField("parentGuardianName", value),
        {
          placeholder: "Enter parent or guardian name",
        },
      )}

      {renderTextInput(
        "Relationship",
        form.parentGuardianRelationship,
        (value) => updateField("parentGuardianRelationship", value),
        {
          placeholder: "Example: Parent, guardian",
        },
      )}

      {renderTextInput(
        "Contact Number",
        form.parentGuardianContact,
        (value) => updateField("parentGuardianContact", value),
        {
          placeholder: "Enter contact number",
          keyboardType: "phone-pad",
        },
      )}

      {renderTextInput(
        "Occupation",
        form.parentGuardianOccupation,
        (value) => updateField("parentGuardianOccupation", value),
        {
          placeholder: "Enter occupation",
        },
      )}
    </View>
  );

  const renderSupportSection = () => (
    <View>
      {renderTextInput(
        "Preferred Communication Method",
        form.preferredCommunicationMethod,
        (value) => updateField("preferredCommunicationMethod", value),
        {
          placeholder: "Example: Email, SMS, in-person",
        },
      )}

      {renderTextInput(
        "Learning / Communication Preferences",
        form.learningCommunicationPreferences,
        (value) => updateField("learningCommunicationPreferences", value),
        {
          placeholder:
            "Share preferences that help us support your learning experience",
          multiline: true,
        },
      )}

      {renderTextInput(
        "Additional Support Notes",
        form.additionalSupportNotes,
        (value) => updateField("additionalSupportNotes", value),
        {
          placeholder: "Add anything else you would like the school to know",
          multiline: true,
        },
      )}
    </View>
  );

  const renderSection = (section: SectionKey) => {
    if (openSection !== section) {
      return null;
    }

    switch (section) {
      case "student":
        return renderStudentSection();

      case "contact":
        return renderContactSection();

      case "academic":
        return renderAcademicSection();

      case "emergency":
        return renderEmergencySection();

      case "family":
        return renderFamilySection();

      case "support":
        return renderSupportSection();

      default:
        return null;
    }
  };

  const renderStatusBadge = () => {
    let label = "Not started";
    let icon: keyof typeof Ionicons.glyphMap = "ellipse-outline";

    if (currentStatus === "in_progress") {
      label = "In progress";
      icon = "time-outline";
    }

    if (currentStatus === "completed") {
      label = "Completed";
      icon = "checkmark-circle-outline";
    }

    return (
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor:
              currentStatus === "completed"
                ? colors.success
                : colors.background,
            borderColor:
              currentStatus === "completed" ? colors.success : colors.border,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={16}
          color={
            currentStatus === "completed"
              ? colors.surface
              : colors.textSecondary
          }
        />

        <Text
          style={[
            typography.caption,
            styles.statusText,
            {
              color:
                currentStatus === "completed"
                  ? colors.surface
                  : colors.textSecondary,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View
          style={[
            styles.loadingContainer,
            {
              backgroundColor: colors.background,
            },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />

          <Text
            style={[
              typography.body,
              styles.loadingText,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Loading your Student Information Sheet...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (introVisible && currentStatus === "not_started") {
    return (
      <ScreenContainer>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.introContainer,
              {
                padding: spacing.lg,
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Back to student dashboard"
              style={[
                styles.backButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />

              <Text
                style={[
                  typography.body,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Back
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.introIcon,
                {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={42}
                color={colors.surface}
              />
            </View>

            <Text
              style={[
                typography.title,
                styles.introTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              Student Information Sheet
            </Text>

            <Text
              style={[
                typography.body,
                styles.introDescription,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Complete your student information so your school can keep your
              records organized and provide a smoother support experience.
            </Text>

            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                },
              ]}
            >
              <InfoRow
                icon="create-outline"
                text="You can save your progress and continue later."
                colors={colors}
                typography={typography}
              />

              <InfoRow
                icon="shield-checkmark-outline"
                text="Your information is linked to your student account."
                colors={colors}
                typography={typography}
              />

              <InfoRow
                icon="time-outline"
                text="You can skip this for now and return from your dashboard."
                colors={colors}
                typography={typography}
              />
            </View>

            <TouchableOpacity
              onPress={startSIS}
              accessibilityRole="button"
              accessibilityLabel="Start Student Information Sheet"
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Text
                style={[
                  typography.button,
                  {
                    color: colors.surface,
                  },
                ]}
              >
                Start SIS
              </Text>

              <Ionicons name="arrow-forward" size={20} color={colors.surface} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={skipForNow}
              accessibilityRole="button"
              accessibilityLabel="Skip Student Information Sheet for now"
              style={[
                styles.skipButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  typography.body,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                Skip for now
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            {
              padding: spacing.md,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleBack}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Back to student dashboard"
              style={[
                styles.backButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  opacity: saving ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text
                style={[
                  typography.title,
                  styles.title,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Student Information Sheet
              </Text>

              <Text
                style={[
                  typography.body,
                  styles.subtitle,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                {isCompletedReview
                  ? "Review your saved information."
                  : "Keep your information complete and up to date."}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            {renderStatusBadge()}

            {hasUnsavedChanges && canEdit && (
              <View
                style={[
                  styles.unsavedBadge,
                  {
                    backgroundColor: colors.warning,
                  },
                ]}
              >
                <Ionicons name="ellipse" size={8} color={colors.surface} />

                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.surface,
                    },
                  ]}
                >
                  Unsaved changes
                </Text>
              </View>
            )}
          </View>

          {isCompletedReview && (
            <View
              style={[
                styles.completedNotice,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.success,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.success}
              />

              <View style={styles.completedNoticeText}>
                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  SIS completed
                </Text>

                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  Your information has been saved. You can review it or edit it
                  when needed.
                </Text>
              </View>
            </View>
          )}

          <View
            style={[
              styles.sectionsContainer,
              {
                gap: spacing.sm,
              },
            ]}
          >
            {(Object.keys(SECTION_LABELS) as SectionKey[]).map((section) => (
              <View key={section}>
                {renderSectionHeader(section)}

                {openSection === section && (
                  <View
                    style={[
                      styles.sectionContent,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderBottomLeftRadius: radius.md,
                        borderBottomRightRadius: radius.md,
                      },
                    ]}
                  >
                    {renderSection(section)}
                  </View>
                )}
              </View>
            ))}
          </View>

          {isCompletedReview && (
            <TouchableOpacity
              onPress={enterCompletedEditMode}
              accessibilityRole="button"
              accessibilityLabel="Edit SIS information"
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={colors.surface}
              />

              <Text
                style={[
                  typography.button,
                  {
                    color: colors.surface,
                  },
                ]}
              >
                Edit Information
              </Text>
            </TouchableOpacity>
          )}

          {isCompletedEditing && (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                onPress={() => save("completed")}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Save SIS changes"
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.md,
                    opacity: saving ? 0.6 : 1,
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={colors.surface}
                  />
                )}

                <Text
                  style={[
                    typography.button,
                    {
                      color: colors.surface,
                    },
                  ]}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={cancelCompletedEdit}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing SIS"
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    opacity: saving ? 0.5 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.button,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isCompletedReview && currentStatus !== "completed" && (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                onPress={() => save("completed")}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Complete Student Information Sheet"
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.md,
                    opacity: saving ? 0.6 : 1,
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={colors.surface}
                  />
                )}

                <Text
                  style={[
                    typography.button,
                    {
                      color: colors.surface,
                    },
                  ]}
                >
                  {saving ? "Saving..." : "Complete SIS"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => save("in_progress")}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Save SIS progress"
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    opacity: saving ? 0.5 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="save-outline"
                  size={20}
                  color={colors.primary}
                />

                <Text
                  style={[
                    typography.button,
                    {
                      color: colors.primary,
                    },
                  ]}
                >
                  Save Progress
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={skipForNow}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Skip Student Information Sheet for now"
                style={[
                  styles.skipButton,
                  {
                    opacity: saving ? 0.5 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.body,
                    styles.skipText,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  Skip for now
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function InfoRow({
  icon,
  text,
  colors,
  typography,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: any;
  typography: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={21} color={colors.primary} />

      <Text
        style={[
          typography.body,
          styles.infoRowText,
          {
            color: colors.text,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingBottom: 32,
  },

  introContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 16,
    textAlign: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 4,
    lineHeight: 21,
  },

  backButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 12,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  statusBadge: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusText: {
    fontWeight: "600",
  },

  unsavedBadge: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  completedNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },

  completedNoticeText: {
    flex: 1,
    gap: 4,
  },

  sectionsContainer: {
    marginBottom: 20,
  },

  sectionHeader: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    fontWeight: "700",
  },

  sectionContent: {
    padding: 16,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },

  fieldContainer: {
    marginBottom: 16,
  },

  fieldLabel: {
    fontWeight: "600",
    marginBottom: 7,
  },

  input: {
    width: "100%",
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },

  actionContainer: {
    gap: 12,
    marginTop: 4,
  },

  primaryButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  secondaryButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  skipButton: {
    minHeight: 48,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  skipText: {
    fontWeight: "600",
  },

  introIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },

  introTitle: {
    textAlign: "center",
    fontWeight: "700",
    marginBottom: 10,
  },

  introDescription: {
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 24,
  },

  infoCard: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 18,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  infoRowText: {
    flex: 1,
    lineHeight: 21,
  },

  bottomSpace: {
    height: 20,
  },
});
