// hooks/useDocumentReader.ts
//
// Reads a document aloud sentence by sentence with expo-speech.
//
//   const r = useDocumentReader(docId, doc?.text);
//   r.play(); r.pause(); r.stop(); r.next(); r.prev();
//   r.setSpeed(1.5); r.setVoice(id); r.jumpToSentence(12);
//   r.sentences, r.currentIndex, r.isPlaying, r.finished
//
// Notes:
// - Pause = stop + remember the sentence (Speech.pause() is iOS-only).
// - Position, speed and voice are remembered (AsyncStorage).
// - A "token" stops late callbacks from an old sentence from moving the
//   reader forward after the student jumped somewhere else.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const MIN_SPEED = 0.5;
export const MAX_SPEED = 2.0;
export const SPEED_STEP = 0.25;

const MAX_CHUNK = 400; // Android TTS rejects very long input
const POSITION_KEY = (docId: string | number) => `@inklude/reader-pos/${docId}`;
const PREFS_KEY = "@inklude/reader-prefs";

// ---------- sentence splitting ----------

function splitParagraph(p: string): string[] {
  const out: string[] = [];
  let start = 0;

  for (let i = 0; i < p.length; i++) {
    const ch = p[i];
    if (ch === "." || ch === "!" || ch === "?" || ch === "…") {
      let j = i + 1;
      while (j < p.length && /[.!?…"'”’)\]]/.test(p[j])) j++;
      // Only a real sentence end if followed by whitespace / end ("3.5" stays whole)
      if (j >= p.length || /\s/.test(p[j])) {
        const s = p.slice(start, j).trim();
        if (s) out.push(s);
        start = j;
      }
      i = j - 1;
    }
  }

  const rest = p.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

function pushChunked(sentence: string, out: string[]) {
  let s = sentence;
  while (s.length > MAX_CHUNK) {
    let cut = s.lastIndexOf(" ", MAX_CHUNK);
    if (cut < 100) cut = MAX_CHUNK;
    out.push(s.slice(0, cut).trim());
    s = s.slice(cut).trim();
  }
  if (s) out.push(s);
}

export function splitIntoSentences(text: string): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n{2,}/)) {
    const flat = para.replace(/\s+/g, " ").trim();
    if (!flat) continue;
    for (const s of splitParagraph(flat)) pushChunked(s, out);
  }
  return out;
}

// ---------- hook ----------

export function useDocumentReader(
  docId: string | number,
  text: string | null | undefined,
) {
  const sentences = useMemo(
    () => (text ? splitIntoSentences(text) : []),
    [text],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [voiceId, setVoiceIdState] = useState<string | null>(null);
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [ready, setReady] = useState(false);
  const [resumed, setResumed] = useState(false);

  const tokenRef = useRef(0);
  const indexRef = useRef(0);
  const speedRef = useRef(1);
  const voiceRef = useRef<string | null>(null);
  const playingRef = useRef(false);
  const sentencesRef = useRef<string[]>([]);
  const speakRef = useRef<(index: number) => void>(() => {});

  sentencesRef.current = sentences;

  // Core "speak sentence N, then continue" loop
  speakRef.current = (index: number) => {
    const list = sentencesRef.current;
    Speech.stop();
    const token = ++tokenRef.current;

    if (list.length === 0) return;

    if (index >= list.length) {
      playingRef.current = false;
      setIsPlaying(false);
      setFinished(true);
      AsyncStorage.setItem(POSITION_KEY(docId), "0").catch(() => {});
      return;
    }

    const safe = Math.max(0, index);
    indexRef.current = safe;
    setCurrentIndex(safe);
    setFinished(false);
    playingRef.current = true;
    setIsPlaying(true);

    Speech.speak(list[safe], {
      rate: speedRef.current,
      voice: voiceRef.current ?? undefined,
      onDone: () => {
        if (token !== tokenRef.current) return;
        speakRef.current(safe + 1);
      },
      onError: () => {
        if (token !== tokenRef.current) return;
        playingRef.current = false;
        setIsPlaying(false);
      },
    });
  };

  // Load saved speed/voice/position once the text is available
  useEffect(() => {
    if (sentences.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const [prefsRaw, posRaw] = await Promise.all([
          AsyncStorage.getItem(PREFS_KEY),
          AsyncStorage.getItem(POSITION_KEY(docId)),
        ]);
        if (cancelled) return;

        if (prefsRaw) {
          const prefs = JSON.parse(prefsRaw);
          if (typeof prefs.speed === "number") {
            speedRef.current = prefs.speed;
            setSpeedState(prefs.speed);
          }
          if (typeof prefs.voiceId === "string") {
            voiceRef.current = prefs.voiceId;
            setVoiceIdState(prefs.voiceId);
          }
        }

        const saved = posRaw ? parseInt(posRaw, 10) : 0;
        if (Number.isFinite(saved) && saved > 0 && saved < sentences.length) {
          indexRef.current = saved;
          setCurrentIndex(saved);
          setResumed(true);
        }
      } catch {
        // Storage problems just mean we start from the top.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [docId, sentences.length]);

  // Available device voices
  useEffect(() => {
    let cancelled = false;
    Speech.getAvailableVoicesAsync()
      .then((v) => {
        if (!cancelled) setVoices(v || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Remember position
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(POSITION_KEY(docId), String(currentIndex)).catch(
      () => {},
    );
  }, [currentIndex, ready, docId]);

  // Stop talking when the screen goes away
  useEffect(() => {
    return () => {
      tokenRef.current++;
      Speech.stop();
    };
  }, []);

  const savePrefs = (nextSpeed: number, nextVoice: string | null) => {
    AsyncStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ speed: nextSpeed, voiceId: nextVoice }),
    ).catch(() => {});
  };

  const goTo = useCallback((index: number) => {
    const last = sentencesRef.current.length - 1;
    if (last < 0) return;
    const safe = Math.min(Math.max(0, index), last);
    if (playingRef.current) {
      speakRef.current(safe);
    } else {
      indexRef.current = safe;
      setCurrentIndex(safe);
      setFinished(false);
    }
  }, []);

  const play = useCallback(() => {
    if (sentencesRef.current.length === 0) return;
    setResumed(false);
    speakRef.current(finished ? 0 : indexRef.current);
  }, [finished]);

  const pause = useCallback(() => {
    tokenRef.current++;
    Speech.stop();
    playingRef.current = false;
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    pause();
    indexRef.current = 0;
    setCurrentIndex(0);
    setFinished(false);
  }, [pause]);

  const next = useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const prev = useCallback(() => goTo(indexRef.current - 1), [goTo]);
  const jumpToSentence = useCallback((i: number) => goTo(i), [goTo]);

  const setSpeed = useCallback((value: number) => {
    const clamped = Math.min(
      MAX_SPEED,
      Math.max(MIN_SPEED, Math.round(value / SPEED_STEP) * SPEED_STEP),
    );
    speedRef.current = clamped;
    setSpeedState(clamped);
    savePrefs(clamped, voiceRef.current);
    if (playingRef.current) speakRef.current(indexRef.current);
  }, []);

  const setVoice = useCallback((id: string | null) => {
    voiceRef.current = id;
    setVoiceIdState(id);
    savePrefs(speedRef.current, id);
    if (playingRef.current) speakRef.current(indexRef.current);
  }, []);

  return {
    sentences,
    currentIndex,
    isPlaying,
    finished,
    speed,
    voiceId,
    voices,
    ready,
    resumed,
    play,
    pause,
    stop,
    next,
    prev,
    setSpeed,
    setVoice,
    jumpToSentence,
  };
}
