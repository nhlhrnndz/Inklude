// components/SensorySync.tsx
//
// Renders nothing. Mounted once inside the (app) layout to:
//  1. Load the student's saved sensory-friendly setting from the server
//     when they log in, so it follows them across devices.
//  2. In sensory mode, give a soft haptic tap when a notification arrives
//     (haptics only — no sound).

import * as Haptics from "expo-haptics";
import { useEffect } from "react";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getSensorySettings } from "../utils/sensoryApi";
import { getSocket } from "../utils/socket";

export default function SensorySync() {
  const { user } = useAuth();
  const { sensoryMode, setSensoryMode } = useTheme();

  useEffect(() => {
    if (!user?.id) return;

    // Teachers/guidance never use sensory mode; don't inherit a previous
    // student's setting on a shared device.
    if (user.role !== "student") {
      setSensoryMode(false);
      return;
    }

    let cancelled = false;
    getSensorySettings()
      .then((data) => {
        if (!cancelled) setSensoryMode(!!data.sensoryMode);
      })
      .catch(() => {
        // Offline or server hiccup: keep whatever is stored on the device.
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, setSensoryMode]);

  useEffect(() => {
    if (!sensoryMode) return;

    const socket = getSocket();
    const buzz = () => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics unavailable (e.g. web) — safe to ignore.
      }
    };

    socket.on("notification:new", buzz);
    return () => {
      socket.off("notification:new", buzz);
    };
  }, [sensoryMode]);

  return null;
}
