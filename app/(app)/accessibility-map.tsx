// app/(app)/accessibility-map.tsx
//
// Campus accessibility directory.
//   Everyone: map with pins, filter by facility type, tap a pin for its
//             note and photos. The list under the map is the same data
//             in text form (works with screen readers).
//   Guidance: tap the map to drop a pin, fill the form, attach photos.
//             Selected pins can get more photos, lose photos, or be deleted.
import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    GestureResponderEvent,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
    MapLocation,
    MapType,
    PickedPhoto,
    addMapPhotos,
    assetUrl,
    createMapLocation,
    deleteMapLocation,
    deleteMapPhoto,
    getMapLocations,
} from "../../utils/campusApi";
import { crossAlert } from "../../utils/crossAlert";

const MAP_SOURCE = require("../../assets/images/campus-map.jpg");

// Fallback ratio (width / height) of campus-map.jpg
const FALLBACK_RATIO = 540 / 564;

// expo-asset works on native AND web. Image.resolveAssetSource does not
// exist in react-native-web, which is what crashed the web build.
function getMapRatio(): number {
  try {
    const asset = Asset.fromModule(MAP_SOURCE);
    if (asset?.width && asset?.height) {
      return asset.width / asset.height;
    }
  } catch {
    // ignore and use the fallback
  }
  return FALLBACK_RATIO;
}

const MAP_RATIO = getMapRatio();

const MAX_PHOTOS = 3;

const TYPE_META: Record<
  MapType,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  pwd_restroom: {
    label: "PWD restroom",
    icon: "male-female-outline",
    color: "#7C3AED",
  },
  ramp: { label: "Ramp", icon: "trending-up-outline", color: "#059669" },
  elevator: {
    label: "Elevator",
    icon: "swap-vertical-outline",
    color: "#2563EB",
  },
  accessible_entrance: {
    label: "Accessible entrance",
    icon: "enter-outline",
    color: "#D97706",
  },
  accessible_seating: {
    label: "Accessible seating",
    icon: "people-outline",
    color: "#DB2777",
  },
  other: { label: "Other", icon: "location-outline", color: "#6B7280" },
};

const TYPE_KEYS = Object.keys(TYPE_META) as MapType[];

export default function AccessibilityMapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const isGuidance = user?.role === "guidance" || user?.role === "admin";

  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MapType | "all">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mapWidth, setMapWidth] = useState(0);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  // Guidance: new pin draft
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [building, setBuilding] = useState("");
  const [type, setType] = useState<MapType | null>(null);
  const [floor, setFloor] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [saving, setSaving] = useState(false);

  const mapHeight = mapWidth / MAP_RATIO;

  const load = useCallback(async () => {
    try {
      setLocations(await getMapLocations());
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not load the map",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = useMemo(
    () =>
      filter === "all" ? locations : locations.filter((l) => l.type === filter),
    [locations, filter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, MapLocation[]>();
    visible.forEach((l) => {
      const list = map.get(l.building) ?? [];
      list.push(l);
      map.set(l.building, list);
    });
    return Array.from(map.entries());
  }, [visible]);

  const buildingNames = useMemo(
    () => Array.from(new Set(locations.map((l) => l.building))).sort(),
    [locations],
  );

  const selected = locations.find((l) => l.id === selectedId) ?? null;

  const resetDraft = () => {
    setDraft(null);
    setBuilding("");
    setType(null);
    setFloor("");
    setNote("");
    setPhotos([]);
  };

  const handleMapPress = (e: GestureResponderEvent) => {
    if (!isGuidance || mapWidth === 0) return;

    const ne: any = e.nativeEvent;
    let lx: number = ne?.locationX;
    let ly: number = ne?.locationY;

    // Web: locationX/Y can be undefined on a Pressable click, so work it
    // out from the DOM element's position instead.
    if (!Number.isFinite(lx) || !Number.isFinite(ly)) {
      const target: any = (e as any).currentTarget;
      if (
        target?.getBoundingClientRect &&
        Number.isFinite(ne?.clientX) &&
        Number.isFinite(ne?.clientY)
      ) {
        const rect = target.getBoundingClientRect();
        lx = ne.clientX - rect.left;
        ly = ne.clientY - rect.top;
      } else if (Number.isFinite(ne?.offsetX) && Number.isFinite(ne?.offsetY)) {
        lx = ne.offsetX;
        ly = ne.offsetY;
      }
    }

    if (!Number.isFinite(lx) || !Number.isFinite(ly)) {
      Toast.show({
        type: "error",
        text1: "Could not read where you tapped",
        text2: "Please tap the map again.",
      });
      return;
    }

    const x = Math.min(100, Math.max(0, (lx / mapWidth) * 100));
    const y = Math.min(100, Math.max(0, (ly / mapHeight) * 100));

    setDraft({ x, y });
    setSelectedId(null);
  };

  const pickPhotos = async (limit: number): Promise<PickedPhoto[]> => {
    if (limit <= 0) {
      Toast.show({
        type: "info",
        text1: `A pin can have up to ${MAX_PHOTOS} photos.`,
      });
      return [];
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: limit,
      quality: 0.7,
    });
    if (res.canceled) return [];
    return res.assets
      .slice(0, limit)
      .map((a) => ({ uri: a.uri, mimeType: a.mimeType }));
  };

  const handlePickForDraft = async () => {
    const picked = await pickPhotos(MAX_PHOTOS - photos.length);
    if (picked.length) setPhotos((prev) => [...prev, ...picked]);
  };

  const handleSaveDraft = async () => {
    if (!draft) return;
    if (building.trim().length < 2) {
      Toast.show({ type: "error", text1: "Enter the building or place name." });
      return;
    }
    if (!type) {
      Toast.show({ type: "error", text1: "Choose a facility type." });
      return;
    }

    setSaving(true);
    try {
      const created = await createMapLocation({
        building: building.trim(),
        type,
        floor: floor.trim(),
        note: note.trim(),
        xPct: draft.x,
        yPct: draft.y,
        photos,
      });
      Toast.show({ type: "success", text1: "Pin added" });
      resetDraft();
      await load();
      setSelectedId(created.id);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not save the pin",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhotos = async (loc: MapLocation) => {
    const picked = await pickPhotos(MAX_PHOTOS - loc.photos.length);
    if (picked.length === 0) return;
    try {
      await addMapPhotos(loc.id, picked);
      await load();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not add photos",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    }
  };

  const handleDeletePhoto = (photoId: number) => {
    crossAlert("Remove this photo?", "It will be deleted from the pin.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMapPhoto(photoId);
            await load();
          } catch {
            Toast.show({ type: "error", text1: "Could not remove the photo" });
          }
        },
      },
    ]);
  };

  const handleDeletePin = (loc: MapLocation) => {
    crossAlert(
      "Delete this pin?",
      `${TYPE_META[loc.type].label} at ${loc.building} and its photos will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMapLocation(loc.id);
              setSelectedId(null);
              await load();
            } catch {
              Toast.show({ type: "error", text1: "Could not delete the pin" });
            }
          },
        },
      ],
    );
  };

  const inputStyle = {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.text,
    minHeight: 48,
  } as const;

  const labelStyle = {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    fontWeight: "700" as const,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.xs,
  };

  const chip = (
    key: string,
    label: string,
    selectedChip: boolean,
    onPress: () => void,
    dot?: string,
  ) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: selectedChip }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: selectedChip ? colors.primary : colors.border,
        backgroundColor: selectedChip ? colors.primary : colors.surface,
      }}
    >
      {dot ? (
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: dot,
            marginRight: 8,
            borderWidth: 1,
            borderColor: "#FFFFFF",
          }}
        />
      ) : null}
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.caption.fontSize,
          fontWeight: "700",
          color: selectedChip ? "#FFFFFF" : colors.text,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const smallButton = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    onPress: () => void,
    color: string,
  ) => (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 44,
        paddingHorizontal: 8,
      }}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text
        style={{
          marginLeft: 6,
          fontFamily: typography.body.fontFamily,
          fontSize: typography.caption.fontSize,
          fontWeight: "700",
          color,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPhotoStrip = (loc: MapLocation) =>
    loc.photos.length === 0 ? (
      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          color: colors.textSecondary,
          marginTop: spacing.sm,
        }}
      >
        No photos for this location yet.
      </Text>
    ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: spacing.sm }}
      >
        {loc.photos.map((p) => (
          <View key={p.id} style={{ marginRight: spacing.sm }}>
            <TouchableOpacity
              onPress={() => setViewerUrl(assetUrl(p.url))}
              accessibilityRole="button"
              accessibilityLabel={`Open photo of ${TYPE_META[loc.type].label} at ${loc.building}`}
            >
              <Image
                source={{ uri: assetUrl(p.url) }}
                style={{
                  width: 200,
                  height: 150,
                  borderRadius: radius.md,
                  backgroundColor: colors.secondaryBackground,
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
            {isGuidance ? (
              <TouchableOpacity
                onPress={() => handleDeletePhoto(p.id)}
                accessibilityRole="button"
                accessibilityLabel="Remove this photo"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(0,0,0,0.65)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </ScrollView>
    );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[styles.backButton, { marginBottom: spacing.md }]}
          onPress={() =>
            router.replace(isGuidance ? "/guidance-dashboard" : "/student")
          }
          accessibilityRole="button"
          accessibilityLabel="Back to dashboard"
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
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
          Accessibility Map
        </Text>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 4,
            marginBottom: spacing.md,
          }}
        >
          {isGuidance
            ? "Tap the map to drop a new pin, or tap a pin to manage it."
            : "Tap a pin, or pick a location from the list below, to see its details and photos."}
        </Text>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
        >
          {chip("all", "All", filter === "all", () => setFilter("all"))}
          {TYPE_KEYS.map((k) =>
            chip(
              k,
              TYPE_META[k].label,
              filter === k,
              () => setFilter(k),
              TYPE_META[k].color,
            ),
          )}
        </ScrollView>

        {/* Map */}
        <View
          onLayout={(e) => setMapWidth(e.nativeEvent.layout.width)}
          style={{ width: "100%", marginTop: spacing.sm }}
        >
          {mapWidth > 0 && (
            <View
              style={{
                width: mapWidth,
                height: mapHeight,
                borderRadius: radius.md,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "#FFFFFF",
              }}
            >
              <Image
                source={MAP_SOURCE}
                style={{
                  width: mapWidth,
                  height: mapHeight,
                }}
                resizeMode="contain"
                accessibilityLabel="Campus map with accessibility pins. A full list is below the map."
              />

              {/* Tap layer: sibling of the pins, not their parent */}
              {isGuidance ? (
                <Pressable
                  onPress={handleMapPress}
                  accessibilityRole="button"
                  accessibilityLabel="Campus map. Tap to place a new pin."
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: mapWidth,
                    height: mapHeight,
                  }}
                />
              ) : null}

              {visible.map((l) => {
                const isSel = l.id === selectedId;
                const size = isSel ? 44 : 34;
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => {
                      setSelectedId(l.id);
                      setDraft(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${TYPE_META[l.type].label}, ${l.building}`}
                    accessibilityState={{ selected: isSel }}
                    style={{
                      position: "absolute",
                      left: (l.xPct / 100) * mapWidth - 22,
                      top: (l.yPct / 100) * mapHeight - 44,
                      width: 44,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Ionicons
                      name="location"
                      size={size}
                      color={TYPE_META[l.type].color}
                    />
                  </Pressable>
                );
              })}

              {draft ? (
                <View
                  style={{
                    pointerEvents: "none",
                    position: "absolute",
                    left: (draft.x / 100) * mapWidth - 22,
                    top: (draft.y / 100) * mapHeight - 44,
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <Ionicons name="location" size={44} color="#000000" />
                </View>
              ) : null}
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: spacing.lg }}
          />
        ) : null}

        {/* Guidance: new pin form */}
        {isGuidance && draft ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              borderWidth: 2,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginTop: spacing.lg,
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
              New pin
            </Text>

            <Text style={labelStyle}>BUILDING OR PLACE *</Text>
            <TextInput
              style={inputStyle}
              value={building}
              onChangeText={setBuilding}
              placeholder="e.g. Library"
              placeholderTextColor={colors.placeholder}
              maxLength={100}
              accessibilityLabel="Building or place name"
            />
            {buildingNames.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginBottom: spacing.sm }}
              >
                {buildingNames.map((b) =>
                  chip(`b-${b}`, b, building === b, () => setBuilding(b)),
                )}
              </ScrollView>
            ) : null}

            <Text style={labelStyle}>WHAT IS IT? *</Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: spacing.sm,
              }}
            >
              {TYPE_KEYS.map((k) =>
                chip(
                  `t-${k}`,
                  TYPE_META[k].label,
                  type === k,
                  () => setType(k),
                  TYPE_META[k].color,
                ),
              )}
            </View>

            <Text style={labelStyle}>FLOOR (OPTIONAL)</Text>
            <TextInput
              style={inputStyle}
              value={floor}
              onChangeText={setFloor}
              placeholder="e.g. Ground floor"
              placeholderTextColor={colors.placeholder}
              maxLength={30}
              accessibilityLabel="Floor"
            />

            <Text style={labelStyle}>NOTE (OPTIONAL)</Text>
            <TextInput
              style={[inputStyle, { minHeight: 80 }]}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Left of the main lobby, door is automatic"
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={300}
              textAlignVertical="top"
              accessibilityLabel="Note"
            />

            <Text style={labelStyle}>PHOTOS (UP TO {MAX_PHOTOS})</Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: spacing.sm,
              }}
            >
              {photos.map((p, i) => (
                <View key={`${p.uri}-${i}`}>
                  <Image
                    source={{ uri: p.uri }}
                    style={{ width: 90, height: 90, borderRadius: radius.sm }}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Remove this photo"
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: "rgba(0,0,0,0.65)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < MAX_PHOTOS ? (
                <TouchableOpacity
                  onPress={handlePickForDraft}
                  accessibilityRole="button"
                  accessibilityLabel="Choose photos"
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="image-outline"
                    size={26}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: colors.primary,
                      marginTop: 2,
                    }}
                  >
                    Add photo
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={handleSaveDraft}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Save pin"
              style={{
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                minHeight: 52,
                alignItems: "center",
                justifyContent: "center",
                opacity: saving ? 0.6 : 1,
                marginTop: spacing.sm,
              }}
            >
              {saving ? (
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
                  Save pin
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={resetDraft}
              accessibilityRole="button"
              accessibilityLabel="Cancel new pin"
              style={{ alignItems: "center", paddingVertical: spacing.md }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.textSecondary,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Selected pin details */}
        {selected ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: TYPE_META[selected.type].color,
              borderWidth: 2,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginTop: spacing.lg,
            }}
            accessibilityLiveRegion="polite"
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={TYPE_META[selected.type].icon}
                size={26}
                color={TYPE_META[selected.type].color}
              />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text
                  style={{
                    fontFamily: typography.title.fontFamily,
                    fontSize: typography.title.fontSize,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {TYPE_META[selected.type].label}
                </Text>
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    color: colors.textSecondary,
                  }}
                >
                  {selected.building}
                  {selected.floor ? ` · ${selected.floor}` : ""}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedId(null)}
                accessibilityRole="button"
                accessibilityLabel="Close details"
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selected.note ? (
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.text,
                  marginTop: spacing.sm,
                }}
              >
                {selected.note}
              </Text>
            ) : null}

            {renderPhotoStrip(selected)}

            {isGuidance ? (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginTop: spacing.sm,
                }}
              >
                {selected.photos.length < MAX_PHOTOS
                  ? smallButton(
                      "Add photos",
                      "image-outline",
                      () => handleAddPhotos(selected),
                      colors.primary,
                    )
                  : null}
                {smallButton(
                  "Delete pin",
                  "trash-outline",
                  () => handleDeletePin(selected),
                  colors.error,
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* List (text version of the map) */}
        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            marginTop: spacing.xl,
            marginBottom: spacing.sm,
          }}
          accessibilityRole="header"
        >
          All locations
        </Text>

        {!loading && grouped.length === 0 ? (
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
            }}
          >
            {isGuidance
              ? "No pins yet. Tap the map to add the first one."
              : "No accessibility locations have been added yet."}
          </Text>
        ) : null}

        {grouped.map(([bName, list]) => (
          <View
            key={bName}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: typography.title.fontSize,
                fontWeight: "700",
                color: colors.text,
                marginBottom: spacing.xs,
              }}
              accessibilityRole="header"
            >
              {bName}
            </Text>
            {list.map((l) => (
              <TouchableOpacity
                key={l.id}
                onPress={() => {
                  setSelectedId(l.id);
                  setDraft(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${TYPE_META[l.type].label}${l.floor ? `, ${l.floor}` : ""}${l.photos.length ? `, ${l.photos.length} photos` : ""}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minHeight: 48,
                  paddingVertical: 6,
                }}
              >
                <Ionicons
                  name={TYPE_META[l.type].icon}
                  size={22}
                  color={TYPE_META[l.type].color}
                />
                <Text
                  style={{
                    flex: 1,
                    marginLeft: spacing.sm,
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    color: colors.text,
                  }}
                >
                  {TYPE_META[l.type].label}
                  {l.floor ? ` · ${l.floor}` : ""}
                </Text>
                {l.photos.length > 0 ? (
                  <Ionicons
                    name="image-outline"
                    size={18}
                    color={colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                ) : null}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Full-size photo */}
      <Modal
        visible={!!viewerUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUrl(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.92)",
            justifyContent: "center",
          }}
        >
          {viewerUrl ? (
            <Image
              source={{ uri: viewerUrl }}
              style={{ width: "100%", height: "80%" }}
              resizeMode="contain"
              accessibilityLabel="Location photo"
            />
          ) : null}
          <TouchableOpacity
            onPress={() => setViewerUrl(null)}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            style={{
              position: "absolute",
              top: 48,
              right: 20,
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    alignSelf: "flex-start",
  },
});
