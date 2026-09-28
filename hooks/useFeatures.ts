// hooks/useFeatures.ts
//
// Screens call this to ask "should I show X for this student?" without
// knowing anything about disability types or the feature map directly.
//
//   const { hasFeature, features, disabilityTypes } = useFeatures();
//   {hasFeature('live_captions') && <LiveCaptionView />}

import { useMemo } from "react";
import { FeatureKey, getActiveFeatures } from "../constants/featureMap";
import { useAuth } from "../context/AuthContext";

type UseFeaturesResult = {
  features: FeatureKey[];
  disabilityTypes: string[];
  accessibilityPreferences: Record<string, any>;
  hasFeature: (key: FeatureKey) => boolean;
  loading: boolean;
};

export function useFeatures(): UseFeaturesResult {
  const { profile, profileLoading } = useAuth();

  const disabilityTypes = profile?.disabilityTypes || [];
  const accessibilityPreferences = profile?.accessibilityPreferences || {};

  const features = useMemo(
    () => getActiveFeatures(disabilityTypes),
    [disabilityTypes],
  );

  const hasFeature = (key: FeatureKey) => features.includes(key);

  return {
    features,
    disabilityTypes,
    accessibilityPreferences,
    hasFeature,
    loading: profileLoading,
  };
}
