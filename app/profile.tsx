import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getMyProfile, saveMyProfile } from "../utils/api";

const DISABILITY_OPTIONS = [
  "Deaf",
  "Hard of Hearing",
  "Non-Verbal",
  "Autism",
  "ADHD",
  "Dyslexia",
];

const PREFERENCE_OPTIONS: { key: string; label: string }[] = [
  { key: "liveCaptions", label: "Live Captions" },
  { key: "highContrast", label: "High Contrast" },
  { key: "dyslexiaFont", label: "Dyslexia Font" },
  { key: "simplifiedUI", label: "Simplified UI" },
];

// How long to show the "Profile Saved" confirmation before redirecting
const SUCCESS_DISPLAY_MS = 1200;

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    liveCaptions: false,
    highContrast: false,
    dyslexiaFont: false,
    simplifiedUI: false,
  });

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const data = await getMyProfile();
      setSelectedTypes(data.disabilityTypes || []);
      setPreferences((prev) => ({ ...prev, ...data.accessibilityPreferences }));
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        console.error("Error loading profile:", err);
      }
      // 404 just means no profile yet — that's fine, keep defaults
    } finally {
      setLoading(false);
    }
  };

  const toggleDisabilityType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const togglePreference = (key: string) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (selectedTypes.length === 0) {
      Alert.alert(
        "Missing info",
        "Please select at least one disability category.",
      );
      return;
    }

    setSaving(true);
    try {
      await saveMyProfile(selectedTypes, preferences);
      setSaving(false);
      setSaveSuccess(true);

      // Show the success screen briefly, then redirect to the dashboard
      setTimeout(() => {
        router.replace("/student");
      }, SUCCESS_DISPLAY_MS);
    } catch (err) {
      console.error("Error saving profile:", err);
      setSaving(false);
      Alert.alert("Error", "Could not save your profile. Please try again.");
    }
  };

  // Initial profile load
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Success confirmation, shown right after a successful save
  if (saveSuccess) {
    return (
      <View style={styles.centered}>
        <View style={styles.successCircle}>
          <Text style={styles.successCheck}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Profile Saved</Text>
        <Text style={styles.successSubtitle}>
          Taking you to your dashboard…
        </Text>
        <ActivityIndicator size="small" style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your Profile</Text>
      <Text style={styles.subtitle}>
        Select your disability category and preferences so we can personalize
        your experience.
      </Text>

      <Text style={styles.sectionTitle}>Disability Category</Text>
      <View style={styles.optionsGrid}>
        {DISABILITY_OPTIONS.map((type) => {
          const selected = selectedTypes.includes(type);
          return (
            <TouchableOpacity
              key={type}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleDisabilityType(type)}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Accessibility Preferences</Text>
      {PREFERENCE_OPTIONS.map((pref) => (
        <View key={pref.key} style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>{pref.label}</Text>
          <Switch
            value={preferences[pref.key]}
            onValueChange={() => togglePreference(pref.key)}
          />
        </View>
      ))}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Profile</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 10,
  },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: "#4A6FA5", borderColor: "#4A6FA5" },
  chipText: { color: "#333" },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  preferenceLabel: { fontSize: 15 },
  saveButton: {
    backgroundColor: "#4A6FA5",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 30,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#4A6FA5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successCheck: { color: "#fff", fontSize: 36, fontWeight: "bold" },
  successTitle: { fontSize: 20, fontWeight: "bold", color: "#222" },
  successSubtitle: { fontSize: 14, color: "#666", marginTop: 6 },
});
