// app/viewboard/[id].tsx
//
// Classroom Viewboard — a listen-only display of a session's live
// captions, meant to run in a browser on the teacher's own laptop
// (the one already connected to the classroom board via HDMI).
//
// Three ways to use it on the board:
//   - Full mode:        captions fill the whole screen (no slides)
//   - Caption bar mode:  a short strip to snap under slides (Duplicate display)
//   - Float captions:    a small always-on-top window over a fullscreen
//                         slideshow (desktop Chrome/Edge only)

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useCaptionSession } from "../../hooks/useCaptionSession";
import { getSessionDetails, getSessionTranscripts } from "../../utils/api";

type ViewMode = "full" | "bar";

interface HistoryCaption {
  text: string;
  timestamp: number;
}

const MIN_FONT = 24;
const MAX_FONT = 96;
const IDLE_MS = 8000;

export default function ViewboardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [loadingSession, setLoadingSession] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [sessionActive, setSessionActive] = useState(true);

  const [history, setHistory] = useState<HistoryCaption[]>([]);

  const [mode, setMode] = useState<ViewMode>("full");
  const [fontSize, setFontSize] = useState(56);
  const [floatUnsupported, setFloatUnsupported] = useState(false);
  const [floating, setFloating] = useState(false);

  const pipWindowRef = useRef<any>(null);
  const pipDivRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);

  const { captions, connected, denied, sessionEnded } = useCaptionSession(
    id,
    user?.id,
    "viewboard",
  );

  // ---- Load session details. This also doubles as the ownership
  // check — the server already returns 403 to non-owners here. ----
  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const data = await getSessionDetails(Number(id));
        setSessionTitle(data.session.title);
        setSessionCode(data.session.code);
        setSessionActive(data.session.status === "active");
      } catch (err: any) {
        console.error("Viewboard: failed to load session", err);
        setAccessError(
          err?.response?.status === 403
            ? "Only the teacher who owns this session can open the Viewboard."
            : "Could not load this session.",
        );
      } finally {
        setLoadingSession(false);
      }
    })();
  }, [id]);

  // ---- Catch-up: load recent transcript lines once, so opening the
  // Viewboard mid-class or after a reconnect isn't a blank screen. ----
  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const data = await getSessionTranscripts(Number(id));
        const rows = data.transcripts || [];

        // NOTE: field names here are a best guess (text/created_at).
        // If history doesn't populate, check server/models/transcriptModel.js
        // for the actual column names and adjust the two lines below.
        const mapped: HistoryCaption[] = rows.map((row: any) => ({
          text: row.text ?? row.transcript_text ?? row.caption_text ?? "",
          timestamp: row.created_at
            ? new Date(row.created_at).getTime()
            : (row.timestamp ?? Date.now()),
        }));

        setHistory(mapped);
      } catch (err) {
        console.error("Viewboard: failed to load transcript history", err);
      }
    })();
  }, [id]);

  // Combine history (loaded once) with live captions from the socket.
  const allCaptions = useMemo(
    () => [...history, ...captions],
    [history, captions],
  );

  const lastCaption = allCaptions[allCaptions.length - 1];
  const recentCaptions = allCaptions.slice(-5);

  // ---- Idle detection ----
  const [isIdle, setIsIdle] = useState(true);
  useEffect(() => {
    const check = () => {
      if (!lastCaption) {
        setIsIdle(true);
        return;
      }
      setIsIdle(Date.now() - lastCaption.timestamp > IDLE_MS);
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [lastCaption]);

  // ---- Keep the floating window's text in sync ----
  useEffect(() => {
    if (pipDivRef.current && lastCaption) {
      pipDivRef.current.textContent = lastCaption.text;
    }
  }, [lastCaption]);

  // ---- Keyboard shortcuts: +/- font size (web, Full mode) ----
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") {
        setFontSize((f) => Math.min(MAX_FONT, f + 4));
      } else if (e.key === "-" || e.key === "_") {
        setFontSize((f) => Math.max(MIN_FONT, f - 4));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ---- Screen wake lock so the board doesn't sleep mid-class ----
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!("wakeLock" in navigator)) return;

    let released = false;

    const requestLock = async () => {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request(
          "screen",
        );
      } catch (err) {
        // Fails silently on plain http:// LAN addresses — wake lock
        // needs HTTPS or localhost. Fall back to OS power settings.
        console.log("Viewboard: wake lock unavailable:", err);
      }
    };

    requestLock();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && !released) {
        requestLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      wakeLockRef.current?.release?.().catch(() => {});
    };
  }, []);

  // ---- Float captions (Document Picture-in-Picture) ----
  const openFloatingCaptions = async () => {
    const dpip = (window as any).documentPictureInPicture;

    if (!dpip) {
      setFloatUnsupported(true);
      return;
    }

    try {
      const pipWindow = await dpip.requestWindow({ width: 520, height: 160 });
      pipWindowRef.current = pipWindow;
      setFloating(true);

      const style = pipWindow.document.createElement("style");
      style.textContent = `
        html, body { margin: 0; height: 100%; background: #0f0f0f; }
        body {
          display: flex; align-items: center; justify-content: center;
          padding: 16px; box-sizing: border-box;
        }
        #ib-caption {
          color: #ffffff;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 26px;
          line-height: 1.35;
          text-align: center;
        }
      `;
      pipWindow.document.head.appendChild(style);

      const div = pipWindow.document.createElement("div");
      div.id = "ib-caption";
      div.textContent = lastCaption?.text || "Listening…";
      pipWindow.document.body.appendChild(div);
      pipDivRef.current = div;

      pipWindow.addEventListener("pagehide", () => {
        pipWindowRef.current = null;
        pipDivRef.current = null;
        setFloating(false);
      });
    } catch (err) {
      console.error("Viewboard: could not open floating captions", err);
      setFloatUnsupported(true);
    }
  };

  const closeFloatingCaptions = () => {
    pipWindowRef.current?.close?.();
    pipWindowRef.current = null;
    pipDivRef.current = null;
    setFloating(false);
  };

  // ---- Render ----

  if (loadingSession) {
    return (
      <View style={styles.centered}>
        <Text style={styles.statusText}>Loading…</Text>
      </View>
    );
  }

  if (accessError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{accessError}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (denied) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{denied}</Text>
      </View>
    );
  }

  if (sessionEnded || !sessionActive) {
    return (
      <View style={styles.centered}>
        <Text style={styles.endedTitle}>Class ended</Text>
        <Text style={styles.endedSubtitle}>{sessionTitle}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, mode === "bar" && styles.containerBar]}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarLabel}>
          {sessionTitle} · #{sessionCode}
        </Text>

        <View style={styles.toolbarRight}>
          <View
            style={[
              styles.liveDot,
              connected ? styles.liveDotOn : styles.liveDotOff,
            ]}
          />
          <Text style={styles.toolbarStatus}>
            {connected ? "Live" : "Reconnecting…"}
          </Text>

          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setMode(mode === "full" ? "bar" : "full")}
          >
            <Text style={styles.modeButtonText}>
              {mode === "full" ? "Switch to Bar" : "Switch to Full"}
            </Text>
          </TouchableOpacity>

          {Platform.OS === "web" && (
            <TouchableOpacity
              style={styles.modeButton}
              onPress={floating ? closeFloatingCaptions : openFloatingCaptions}
            >
              <Text style={styles.modeButtonText}>
                {floating ? "Stop Floating" : "Float Captions"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {floatUnsupported && (
        <Text style={styles.unsupportedText}>
          Floating captions need desktop Chrome or Edge. Try Bar mode under a
          windowed slideshow instead.
        </Text>
      )}

      {mode === "full" ? (
        <View style={styles.fullCaptionArea}>
          {isIdle ? (
            <Text style={[styles.idleText, { fontSize: fontSize * 0.4 }]}>
              Listening…
            </Text>
          ) : (
            recentCaptions.map((c, i) => (
              <Text
                key={`${c.timestamp}-${i}`}
                style={[
                  styles.fullCaptionText,
                  {
                    fontSize,
                    opacity: 0.4 + (0.6 * (i + 1)) / recentCaptions.length,
                  },
                ]}
              >
                {c.text}
              </Text>
            ))
          )}
        </View>
      ) : (
        <View style={styles.barCaptionArea}>
          <Text style={styles.barCaptionText} numberOfLines={2}>
            {isIdle ? "Listening…" : lastCaption?.text}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    padding: 20,
  },
  containerBar: {
    justifyContent: "flex-end",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f0f0f",
    padding: 24,
  },
  statusText: {
    color: "#888",
    fontSize: 18,
  },
  errorText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 16,
  },
  backLink: {
    color: "#4A6FA5",
    fontSize: 16,
  },
  endedTitle: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 8,
  },
  endedSubtitle: {
    color: "#888",
    fontSize: 18,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  toolbarLabel: {
    color: "#888",
    fontSize: 14,
  },
  toolbarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveDotOn: {
    backgroundColor: "#4caf50",
  },
  liveDotOff: {
    backgroundColor: "#e94560",
  },
  toolbarStatus: {
    color: "#888",
    fontSize: 12,
  },
  modeButton: {
    backgroundColor: "#1e1e1e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modeButtonText: {
    color: "#fff",
    fontSize: 12,
  },
  unsupportedText: {
    color: "#e9a745",
    fontSize: 13,
    marginBottom: 10,
  },
  fullCaptionArea: {
    flex: 1,
    justifyContent: "center",
  },
  fullCaptionText: {
    color: "#ffffff",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  idleText: {
    color: "#555",
    textAlign: "center",
    fontStyle: "italic",
  },
  barCaptionArea: {
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  barCaptionText: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "600",
    textAlign: "center",
  },
});
