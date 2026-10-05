
import { Platform } from "react-native";

// 1) After you get your ngrok static domain, put it here:
export const PUBLIC_URL = "https://custodian-flock-viewless.ngrok-free.dev";
// 2) Your laptop's Wi-Fi address (only for Expo Go testing)
const LOCAL_URL = "http://192.168.1.3:5000";

function pickApiUrl() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    // `npx expo start --web` on your laptop → local server
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5000";
    }
    // Opened from ngrok → the website talks to the same address it came from
    return origin;
  }
  // Phone: Expo Go (__DEV__) uses Wi-Fi, the built APK uses ngrok
  return __DEV__ ? LOCAL_URL : PUBLIC_URL;
}

export const API_URL = pickApiUrl();

