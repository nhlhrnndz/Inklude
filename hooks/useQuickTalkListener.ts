// hooks/useQuickTalkListener.ts
//
// Continuous, session-free mic listening for Quick Talk.
// Records short chunks, uses the recording meter to skip silent ones, sends the
// rest through utils/stt.ts, and auto-pauses after a stretch with no speech.
// hold()/resume() let the screen mute the mic while TTS is speaking.
import type { RecordingOptions } from "expo-audio";
import {
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import { isSttError, transcribeSpeech } from "../utils/stt";

// ---- Tuning knobs ---------------------------------------------------------
const CHUNK_MS = 4000; // length of each recorded chunk
const TICK_MS = 150; // how often we read the mic level
const MIN_SPEECH_TICKS = 3; // ~0.5s above threshold = "someone spoke"
const MIN_FLUSH_MS = 800; // on stop/hold, keep a partial chunk only if this long
const RESUME_DELAY_MS = 600; // wait after TTS ends so the mic doesn't hear its tail
const MAX_CONSECUTIVE_ERRORS = 3;
export const AUTO_PAUSE_MS = 30000; // pause after this long with no recognized speech

// Meter values are dB-ish and differ per platform/device. Calibrate using the
// "Mic check" line on the screen (dev builds): note the peak in silence vs speech.
const SPEECH_DB_THRESHOLD = Platform.OS === "android" ? -32 : -40;
// ---------------------------------------------------------------------------

const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

export type ListenerStatus = "stopped" | "listening" | "holding";
export type StopReason = "manual" | "silence" | "background" | "error";

export interface ChunkDebug {
  peakDb: number | null;
  action: "sent" | "skipped";
}

interface UseQuickTalkListenerResult {
  status: ListenerStatus;
  isListening: boolean;
  isTranscribing: boolean;
  /** 0-4, for a simple level indicator */
  level: number;
  error: string | null;
  stopReason: StopReason | null;
  debug: { meteringActive: boolean; lastChunk: ChunkDebug | null };
  start: () => Promise<void>;
  stop: () => Promise<void>;
  /** Mute the mic (e.g. while TTS speaks). Keeps the last few seconds of speech. */
  hold: () => Promise<void>;
  /** Un-mute after hold(). Safe to call when not held. */
  resume: () => Promise<void>;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function levelBucket(db: number): number {
  const normalized = Math.max(0, Math.min(1, (db + 60) / 45));
  return Math.round(normalized * 4);
}

export function useQuickTalkListener(
  onTranscript: (text: string) => void,
): UseQuickTalkListenerResult {
  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);

  const [status, setStatus] = useState<ListenerStatus>("stopped");
  const [stopReason, setStopReason] = useState<StopReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [level, setLevel] = useState(0);
  const [meteringActive, setMeteringActive] = useState(false);
  const [lastChunk, setLastChunk] = useState<ChunkDebug | null>(null);

  // Refs drive the loop so it never reads stale state.
  const mountedRef = useRef(true);
  const wantListeningRef = useRef(false); // user intent: listening or held
  const heldRef = useRef(false);
  const startingRef = useRef(false);
  const loopIdRef = useRef(0); // bumping this cancels the running loop
  const loopPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const endModeRef = useRef<"flush" | "discard">("discard");
  const lastActivityRef = useRef(Date.now());
  const pendingRef = useRef(0);
  const errorStreakRef = useRef(0);

  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Used when the loop itself decides to stop (silence timeout, recorder error).
  const haltFromLoop = useCallback((reason: StopReason) => {
    wantListeningRef.current = false;
    heldRef.current = false;
    loopIdRef.current += 1;
    setStatus("stopped");
    setStopReason(reason);
    setLevel(0);
  }, []);

  const stopInternal = useCallback(async (reason: StopReason) => {
    wantListeningRef.current = false;
    heldRef.current = false;
    endModeRef.current = "flush"; // keep the last words that were being recorded
    loopIdRef.current += 1;
    setStatus("stopped");
    setStopReason(reason);
    setLevel(0);
    await loopPromiseRef.current;

    // Back to a playback-friendly audio mode so TTS uses the loudspeaker (iOS)
    if (!wantListeningRef.current) {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
      } catch {
        // non-fatal
      }
    }
  }, []);

  const uploadChunk = useCallback(
    (uri: string, speechConfirmed: boolean) => {
      pendingRef.current += 1;
      setIsTranscribing(true);

      transcribeSpeech(uri, { speechConfirmed })
        .then((text) => {
          errorStreakRef.current = 0;
          if (!text || !mountedRef.current) return;
          lastActivityRef.current = Date.now();
          onTranscriptRef.current(text);
        })
        .catch((err: unknown) => {
          if (!mountedRef.current) return;
          console.warn("Quick Talk chunk failed:", err);

          if (isSttError(err) && err.kind === "unavailable") {
            setError(err.message);
            void stopInternal("error");
            return;
          }

          errorStreakRef.current += 1;
          if (errorStreakRef.current >= MAX_CONSECUTIVE_ERRORS) {
            setError(
              isSttError(err)
                ? err.message
                : "Speech recognition keeps failing. Please try again.",
            );
            void stopInternal("error");
          }
        })
        .finally(() => {
          pendingRef.current = Math.max(0, pendingRef.current - 1);
          if (pendingRef.current === 0) setIsTranscribing(false);
        });
    },
    [stopInternal],
  );

  const runLoop = useCallback(
    async (loopId: number) => {
      const cancelled = () => loopIdRef.current !== loopId;

      const readMetering = (): number | undefined => {
        try {
          const m = audioRecorder.getStatus().metering;
          return typeof m === "number" && Number.isFinite(m) ? m : undefined;
        } catch {
          return undefined;
        }
      };

      try {
        while (!cancelled()) {
          // Auto-pause after a long stretch with no recognized speech
          if (Date.now() - lastActivityRef.current > AUTO_PAUSE_MS) {
            haltFromLoop("silence");
            return;
          }

          await audioRecorder.prepareToRecordAsync(RECORDING_OPTIONS);
          if (cancelled()) return;

          audioRecorder.record();
          const startedAt = Date.now();

          let ticks = 0;
          let speechTicks = 0;
          let minDb = Infinity;
          let maxDb = -Infinity;

          while (!cancelled() && Date.now() - startedAt < CHUNK_MS) {
            await sleep(TICK_MS);
            const db = readMetering();
            if (db === undefined) continue;

            ticks += 1;
            minDb = Math.min(minDb, db);
            maxDb = Math.max(maxDb, db);
            if (db > SPEECH_DB_THRESHOLD) speechTicks += 1;
            setLevel(levelBucket(db));
          }

          const wasCancelled = cancelled();
          const durationMs = Date.now() - startedAt;

          try {
            await audioRecorder.stop();
          } catch {
            // already stopped
          }

          // Cancelled and not worth keeping (discard mode, or too short)
          if (
            wasCancelled &&
            (endModeRef.current === "discard" || durationMs < MIN_FLUSH_MS)
          ) {
            return;
          }

          // Is the meter trustworthy for this chunk? Missing or perfectly flat
          // readings (web, or a broken meter) mean "unknown", so we upload and
          // let the text filter decide instead of silencing everything.
          const metered = ticks >= 3 && maxDb - minDb > 0.5;
          const speechConfirmed = metered && speechTicks >= MIN_SPEECH_TICKS;
          const shouldSend = !metered || speechConfirmed;
          const uri = audioRecorder.uri;

          setMeteringActive(metered);
          setLastChunk({
            peakDb: metered ? Math.round(maxDb) : null,
            action: uri && shouldSend ? "sent" : "skipped",
          });

          if (uri && shouldSend) {
            uploadChunk(uri, speechConfirmed);
          }

          if (wasCancelled) return;
        }
      } catch (err) {
        if (cancelled()) return;
        console.error("Quick Talk recording error:", err);
        setError(err instanceof Error ? err.message : "Recording failed");
        haltFromLoop("error");
      }
    },
    [audioRecorder, haltFromLoop, uploadChunk],
  );

  const launchLoop = useCallback(() => {
    loopIdRef.current += 1;
    endModeRef.current = "discard";
    loopPromiseRef.current = runLoop(loopIdRef.current);
  }, [runLoop]);

  const start = useCallback(async () => {
    if (wantListeningRef.current || startingRef.current) return;
    startingRef.current = true;

    try {
      setError(null);
      setStopReason(null);

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError(
          "Microphone permission was denied. Allow microphone access to use Quick Talk.",
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await loopPromiseRef.current; // make sure any previous loop has finished

      wantListeningRef.current = true;
      heldRef.current = false;
      lastActivityRef.current = Date.now();
      errorStreakRef.current = 0;
      setStatus("listening");
      launchLoop();
    } catch (err) {
      console.error("Quick Talk start error:", err);
      setError(
        err instanceof Error ? err.message : "Could not start the microphone",
      );
    } finally {
      startingRef.current = false;
    }
  }, [launchLoop]);

  const stop = useCallback(() => stopInternal("manual"), [stopInternal]);

  const hold = useCallback(async () => {
    if (!wantListeningRef.current) return;

    // Already held: just wait until the recorder has fully stopped
    if (heldRef.current) {
      await loopPromiseRef.current;
      return;
    }

    heldRef.current = true;
    endModeRef.current = "flush"; // don't lose what was just said before replying
    loopIdRef.current += 1;
    setStatus("holding");
    setLevel(0);

    await loopPromiseRef.current; // recorder is fully stopped after this

    try {
      // Lets iOS route TTS to the loudspeaker instead of the earpiece
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch {
      // non-fatal
    }
  }, []);

  const resume = useCallback(async () => {
    if (!wantListeningRef.current || !heldRef.current) return;

    await sleep(RESUME_DELAY_MS);
    if (!wantListeningRef.current || !heldRef.current) return; // stopped meanwhile

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
    } catch {
      // non-fatal
    }

    heldRef.current = false;
    lastActivityRef.current = Date.now(); // replying counts as activity
    setStatus("listening");
    launchLoop();
  }, [launchLoop]);

  // Stop when the app goes to the background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" && wantListeningRef.current) {
        void stopInternal("background");
      }
    });
    return () => sub.remove();
  }, [stopInternal]);

  // Unmount: cancel the loop and discard any partial chunk
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      wantListeningRef.current = false;
      endModeRef.current = "discard";
      loopIdRef.current += 1;
    };
  }, []);

  return {
    status,
    isListening: status !== "stopped",
    isTranscribing,
    level,
    error,
    stopReason,
    debug: { meteringActive, lastChunk },
    start,
    stop,
    hold,
    resume,
  };
}
