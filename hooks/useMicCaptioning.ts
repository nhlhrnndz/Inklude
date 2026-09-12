// hooks/useMicCaptioning.ts
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudioChunk } from "../utils/api";

const CHUNK_DURATION_MS = 5000; // record 5s → upload → repeat

interface UseMicCaptioningResult {
  isRecording: boolean;
  error: string | null;
  startCaptioning: () => Promise<void>;
  stopCaptioning: () => Promise<void>;
}

export function useMicCaptioning(
  onTranscript: (text: string) => void,
): UseMicCaptioningResult {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drives the recursive chunk loop; a ref avoids stale closures across renders.
  const isActiveRef = useRef(false);

  // Keep the latest callback without re-creating recordChunk every render.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const recordChunk = useCallback(async () => {
    if (!isActiveRef.current) return;

    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      await new Promise((resolve) => setTimeout(resolve, CHUNK_DURATION_MS));

      if (!isActiveRef.current) {
        // stopCaptioning() fired mid-chunk — stop cleanly, skip uploading a partial clip
        try {
          await audioRecorder.stop();
        } catch {
          // already stopped
        }
        return;
      }

      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri) {
        // Fire-and-forget so the next chunk starts immediately instead of
        // waiting on the network round trip.
        transcribeAudioChunk(uri)
          .then((text) => {
            if (text && isActiveRef.current) {
              onTranscriptRef.current(text);
            }
          })
          .catch((err) => {
            console.warn("Chunk transcription failed:", err);
            // One bad chunk shouldn't kill the whole captioning session
          });
      }

      recordChunk();
    } catch (err) {
      console.error("Recording error:", err);
      setError(err instanceof Error ? err.message : "Recording failed");
      isActiveRef.current = false;
      setIsRecording(false);
    }
  }, [audioRecorder]);

  const startCaptioning = useCallback(async () => {
    setError(null);

    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone permission was denied");
      return;
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    isActiveRef.current = true;
    setIsRecording(true);
    recordChunk();
  }, [recordChunk]);

  const stopCaptioning = useCallback(async () => {
    isActiveRef.current = false;
    setIsRecording(false);
    try {
      await audioRecorder.stop();
    } catch {
      // Recorder may already be stopped between chunks — safe to ignore
    }
  }, [audioRecorder]);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
    };
  }, []);

  return { isRecording, error, startCaptioning, stopCaptioning };
}
