// hooks/useQuickTalkSpeech.ts
//
// Speaks Quick Talk replies with expo-speech (same voice/speed/pitch setup as
// app/(app)/tts.tsx). beforeSpeak/afterSpeak let the screen mute and unmute the
// microphone around each reply so the phone never captions its own voice.
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_RATE = 0.1;
const MAX_RATE = 2.0;
const MIN_PITCH = 0.5;
const MAX_PITCH = 2.0;

interface UseQuickTalkSpeechOptions {
  /** Runs before speaking, e.g. mute the mic. */
  beforeSpeak?: () => Promise<void>;
  /** Runs when a reply ends or is stopped, e.g. unmute the mic. */
  afterSpeak?: () => void;
  /** Called with a readable message when text-to-speech fails. */
  onError?: (message: string) => void;
}

interface UseQuickTalkSpeechResult {
  /** True from the moment a reply is requested until it finishes. */
  isBusy: boolean;
  /** True while audio is actually playing. */
  isSpeaking: boolean;
  rate: number;
  pitch: number;
  adjustRate: (delta: number) => void;
  adjustPitch: (delta: number) => void;
  /** Resolves true if speech started, false if ignored or cancelled. */
  speak: (text: string) => Promise<boolean>;
  stopSpeaking: () => void;
}

export function useQuickTalkSpeech(
  options: UseQuickTalkSpeechOptions = {},
): UseQuickTalkSpeechResult {
  const [voiceId, setVoiceId] = useState<string | undefined>(undefined);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const busyRef = useRef(false);
  const replyIdRef = useRef(0); // bumping this invalidates old callbacks
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settingsRef = useRef({ voiceId, rate, pitch });
  useEffect(() => {
    settingsRef.current = { voiceId, rate, pitch };
  }, [voiceId, rate, pitch]);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Same default-voice logic as tts.tsx: first English voice, if any
  useEffect(() => {
    let alive = true;

    Speech.getAvailableVoicesAsync()
      .then((available) => {
        if (!alive) return;
        const english = available.find((v) => v.language?.startsWith("en"));
        if (english) setVoiceId(english.identifier);
      })
      .catch(() => {
        // No voice list (some devices/browsers) — the system default is used
      });

    return () => {
      alive = false;
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Ends a reply exactly once, no matter which callback fires first.
  const endReply = useCallback(
    (id: number) => {
      if (replyIdRef.current !== id) return;

      replyIdRef.current += 1;
      clearTimer();
      busyRef.current = false;
      setIsSpeaking(false);
      setIsBusy(false);
      optionsRef.current.afterSpeak?.();
    },
    [clearTimer],
  );

  const speak = useCallback(
    async (text: string): Promise<boolean> => {
      const value = text.trim();
      if (!value || busyRef.current) return false;

      busyRef.current = true;
      setIsBusy(true);
      replyIdRef.current += 1;
      const id = replyIdRef.current;

      try {
        await optionsRef.current.beforeSpeak?.();
      } catch (err) {
        console.warn("Quick Talk beforeSpeak failed:", err);
      }

      // Stopped while we were getting ready
      if (replyIdRef.current !== id) return false;

      const { voiceId: voice, rate: r, pitch: p } = settingsRef.current;

      // Safety net: some engines (notably browsers) never report "done".
      const estimateMs = 4000 + (value.length * 100) / Math.max(r, 0.1);
      timerRef.current = setTimeout(() => {
        Speech.stop();
        endReply(id);
      }, estimateMs);

      Speech.stop();
      setIsSpeaking(true);

      Speech.speak(value, {
        voice,
        rate: r,
        pitch: p,
        onDone: () => endReply(id),
        onStopped: () => endReply(id),
        onError: () => {
          optionsRef.current.onError?.(
            "Couldn't speak that. Check the phone's volume and text-to-speech settings.",
          );
          endReply(id);
        },
      });

      return true;
    },
    [endReply],
  );

  const stopSpeaking = useCallback(() => {
    if (!busyRef.current) return;
    Speech.stop();
    endReply(replyIdRef.current);
  }, [endReply]);

  const adjustRate = useCallback((delta: number) => {
    setRate((prev) =>
      Math.min(MAX_RATE, Math.max(MIN_RATE, +(prev + delta).toFixed(1))),
    );
  }, []);

  const adjustPitch = useCallback((delta: number) => {
    setPitch((prev) =>
      Math.min(MAX_PITCH, Math.max(MIN_PITCH, +(prev + delta).toFixed(1))),
    );
  }, []);

  // Unmount: silence everything without triggering afterSpeak
  useEffect(() => {
    return () => {
      replyIdRef.current += 1;
      busyRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      Speech.stop();
    };
  }, []);

  return {
    isBusy,
    isSpeaking,
    rate,
    pitch,
    adjustRate,
    adjustPitch,
    speak,
    stopSpeaking,
  };
}
