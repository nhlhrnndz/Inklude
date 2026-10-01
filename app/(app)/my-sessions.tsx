// my-sessions.tsx — replaced by My Classes. Kept as a redirect so any
// old link (dashboard cards, deep links) still lands in the right place.
import { Redirect } from "expo-router";

export default function MySessionsRedirect() {
  return <Redirect href={"/my-classes" as any} />;
}
