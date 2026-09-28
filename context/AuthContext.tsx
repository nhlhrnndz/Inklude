//AuthContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type ProfileData = {
  disabilityTypes: string[];
  accessibilityPreferences: Record<string, any>;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  profile: ProfileData | null;
  profileLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    role: string,
  ) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: User) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileData: (profile: ProfileData) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const PROFILE_STORAGE_KEY = "profile";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetches the student's disability profile from the API and updates
  // both in-memory state and AsyncStorage. Swallows 404 (no profile yet)
  // as a normal "no preferences set" state rather than an error.
  const fetchProfile = async (): Promise<ProfileData | null> => {
    try {
      const res = await api.get("/api/profile");
      const fresh: ProfileData = {
        disabilityTypes: res.data.disabilityTypes || [],
        accessibilityPreferences: res.data.accessibilityPreferences || {},
      };
      setProfile(fresh);
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setProfile(null);
        await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
        return null;
      }
      // Network hiccup etc. — leave whatever's already in state/storage
      // alone rather than wiping it out.
      console.error("Failed to fetch profile:", err);
      return profile;
    }
  };

  // Load saved login on app start
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");
        const storedProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile));
        }
      } catch (err) {
        console.error("Failed to load auth:", err);
      } finally {
        setLoading(false);
        setProfileLoading(false);
      }

      // Refresh preferences in the background so a stale cached profile
      // doesn't stick around after a change made on another device.
      const storedToken = await AsyncStorage.getItem("token");
      if (storedToken) {
        setProfileLoading(true);
        await fetchProfile();
        setProfileLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  const register = async (
    name: string,
    email: string,
    password: string,
    role: string,
  ) => {
    const res = await api.post("/api/auth/register", {
      name,
      email,
      password,
      role,
    });
    return res.data;
  };

  const login = async (email: string, password: string) => {
    const res = await api.post("/api/auth/login", { email, password });
    const { token, user } = res.data;
    setToken(token);
    setUser(user);
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));

    // Pull preferences right away so screens don't render a beat behind
    // with the wrong feature set right after login.
    setProfileLoading(true);
    await fetchProfile();
    setProfileLoading(false);

    return user;
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear stored auth:", err);
    } finally {
      // Clearing user/token here is all this function needs to do.
      // RootLayoutNav watches `user` and redirects to index/login
      // automatically once it flips to null — see _layout.tsx.
      setToken(null);
      setUser(null);
      setProfile(null);
    }
  };

  // Refresh the in-memory + persisted user after a profile edit,
  // without requiring the user to log in again.
  const updateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
  };

  // Re-fetch preferences from the server. Call this after a screen
  // outside this context's own save flow might have changed them.
  const refreshProfile = async () => {
    setProfileLoading(true);
    await fetchProfile();
    setProfileLoading(false);
  };

  // Update preferences locally right after a successful save, so callers
  // (e.g. the profile screen) don't need to trigger a second network
  // round-trip just to see the new feature set take effect.
  const updateProfileData = async (updated: ProfileData) => {
    setProfile(updated);
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        profile,
        profileLoading,
        login,
        register,
        logout,
        updateUser,
        refreshProfile,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
