// utils/stt.ts
//
// The ONE place Quick Talk turns audio into text.
// Week 9: replace the body of `transcribeSpeech` with the offline recognizer
// (or an online/offline switch). Nothing else in Quick Talk needs to change.
import axios from "axios";
import { API_URL } from "../constants/config";
import { transcribeAudioChunk } from "./api";

const UPLOAD_TIMEOUT_MS = 20000;
const RETRY_DELAY_MS = 700;
const MAX_ATTEMPTS = 2;

export type SttErrorKind = "unavailable" | "network" | "failed";

export interface SttError extends Error {
  kind: SttErrorKind;
}

function makeSttError(kind: SttErrorKind, message: string): SttError {
  return Object.assign(new Error(message), { kind });
}

export function isSttError(err: unknown): err is SttError {
  return err instanceof Error && "kind" in err;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Phrases Whisper-style models tend to invent on silent or noisy audio.
// Only dropped when the mic level did NOT confirm real speech in the chunk.
const HALLUCINATION_PHRASES = new Set([
  "thank you",
  "thank you very much",
  "thank you so much",
  "thanks",
  "thanks for watching",
  "thank you for watching",
  "you",
  "bye",
  "bye bye",
  "please subscribe",
  "subscribe",
  "like and subscribe",
  "see you next time",
]);

/**
 * Returns cleaned text, or null if the chunk should be ignored.
 * @param speechConfirmed true when the recording meter showed real speech
 */
export function cleanTranscript(
  raw: string | null | undefined,
  speechConfirmed: boolean,
): string | null {
  if (!raw) return null;

  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;

  // Sound-effect / silence tags such as [BLANK_AUDIO], (music), *silence*, ♪
  if (/^[\[(*♪].*[\])*♪]$/.test(text)) return null;

  const normalized = text
    .toLowerCase()
    .replace(/[.,!?;:"“”‘’…\-–—()\[\]*♪]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Punctuation only ("." or "...")
  if (!normalized) return null;

  // Subtitle-credit hallucinations
  if (normalized.includes("amara org")) return null;

  if (!speechConfirmed) {
    if (HALLUCINATION_PHRASES.has(normalized)) return null;

    // Runaway repetition: "you you you you"
    const words = normalized.split(" ");
    if (words.length >= 4 && new Set(words).size === 1) return null;
  }

  return text;
}

// Rejects with a "network" SttError if the upload takes too long.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        makeSttError(
          "network",
          `The server at ${API_URL} took too long to respond.`,
        ),
      );
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Detailed line for the Metro terminal — tells us WHY an upload failed.
function logUploadFailure(err: unknown, fileUri: string, attempt: number) {
  if (axios.isAxiosError(err)) {
    console.log("[stt] upload failed", {
      attempt,
      code: err.code,
      message: err.message,
      status: err.response?.status ?? null,
      url: `${err.config?.baseURL ?? ""}${err.config?.url ?? ""}`,
      fileUri,
    });
  } else {
    console.log("[stt] upload failed", {
      attempt,
      message: err instanceof Error ? err.message : String(err),
      fileUri,
    });
  }
}

// True when the request never got an HTTP answer (worth one retry).
function isNoResponseError(err: unknown): boolean {
  if (isSttError(err)) return err.kind === "network";
  return axios.isAxiosError(err) && !err.response;
}

function toSttError(err: unknown): SttError {
  if (isSttError(err)) return err;

  if (axios.isAxiosError(err)) {
    if (err.response?.status === 503) {
      return makeSttError(
        "unavailable",
        "Speech recognition is not set up on the server yet.",
      );
    }
    if (!err.response) {
      return makeSttError(
        "network",
        `Can't reach the server at ${API_URL}. Make sure your phone is on the same Wi-Fi as the computer.`,
      );
    }
  }

  return makeSttError("failed", "Could not transcribe that audio.");
}

/**
 * Transcribe one recorded audio chunk.
 * Resolves to cleaned text, or null when there is nothing worth showing.
 * Rejects with an SttError (kind: "unavailable" | "network" | "failed").
 */
export async function transcribeSpeech(
  fileUri: string,
  options: { speechConfirmed?: boolean } = {},
): Promise<string | null> {
  let raw = "";
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      raw = await withTimeout(transcribeAudioChunk(fileUri), UPLOAD_TIMEOUT_MS);
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      logUploadFailure(err, fileUri, attempt);

      if (!isNoResponseError(err) || attempt === MAX_ATTEMPTS) break;
      await sleep(RETRY_DELAY_MS);
    }
  }

  if (lastError) throw toSttError(lastError);

  return cleanTranscript(raw, options.speechConfirmed ?? false);
}
