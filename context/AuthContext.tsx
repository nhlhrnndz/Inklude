// context/AuthContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import api, { clearCachedToken, setCachedToken } from "../utils/api";

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

type RegisterResult = {
  message: string;
  userId: number;
  role: string;
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
    inviteCode?: string,
  ) => Promise<RegisterResult>;
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
      console.error("Failed to fetch profile:", err);
      return profile;
    }
  };

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");
        const storedProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);

        if (storedToken && storedUser) {
          setCachedToken(storedToken);
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

      const storedToken = await AsyncStorage.getItem("token");
      if (storedToken) {
        setProfileLoading(true);
        await fetchProfile();
        setProfileLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  // The server decides the role from inviteCode. The app never sends "role".
  const register = async (
    name: string,
    email: string,
    password: string,
    inviteCode?: string,
  ): Promise<RegisterResult> => {
    const res = await api.post("/api/auth/register", {
      name,
      email,
      password,
      inviteCode,
    });
    return res.data;
  };

  const login = async (email: string, password: string) => {
    const res = await api.post("/api/auth/login", { email, password });
    const { token, user } = res.data;
    setCachedToken(token);
    setToken(token);
    setUser(user);
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));

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
      clearCachedToken();
      setToken(null);
      setUser(null);
      setProfile(null);
    }
  };

  const updateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const refreshProfile = async () => {
    setProfileLoading(true);
    await fetchProfile();
    setProfileLoading(false);
  };

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
