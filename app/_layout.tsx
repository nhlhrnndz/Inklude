import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f0f0f" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        contentStyle: { backgroundColor: "#0f0f0f" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="student" options={{ title: "Student Dashboard" }} />
      <Stack.Screen name="teacher" options={{ title: "Teacher Dashboard" }} />
      <Stack.Screen name="explore" options={{ title: "Live Caption" }} />
      <Stack.Screen name="join" options={{ title: "Join Session" }} />
      <Stack.Screen name="tts" options={{ title: "Text to Speech" }} />
      <Stack.Screen
        name="create-session"
        options={{ title: "Create Session" }}
      />
    </Stack>
  );
}
