// hooks/useMicCaptioning.ts
import { Audio } from "expo-av";
import { useCallback, useRef, useState } from "react";
import { transcribeAudioChunk } from "../utils/api";

const CHUNK_DURATION_MS = 6000; // record 6 seconds at a time

export function useMicCaptioning(onCaption: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const runningRef = useRef(false); // controls the loop independent of React state timing

  const recordOneChunk = useCallback(async () => {
    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;

      // Let it record for CHUNK_DURATION_MS
      await new Promise((resolve) => setTimeout(resolve, CHUNK_DURATION_MS));

      if (!runningRef.current) {
        // Stop was requested while this chunk was recording
        await recording.stopAndUnloadAsync();
        return;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (uri) {
        try {
          const text = await transcribeAudioChunk(uri);
          if (text && text.trim().length > 0) {
            onCaption(text.trim());
          }
        } catch (err: any) {
          console.log("⚠️ Transcription request failed:", err.message);
          // Don't kill the loop over one failed chunk — just skip it
        }
      }

      // Start the next chunk immediately if still running
      if (runningRef.current) {
        recordOneChunk();
      }
    } catch (err: any) {
      console.error("🎙️ Recording error:", err.message);
      setError(err.message);
      runningRef.current = false;
      setIsRecording(false);
    }
  }, [onCaption]);

  const startCaptioning = useCallback(async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      setError("Microphone permission denied");
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    setError(null);
    runningRef.current = true;
    setIsRecording(true);
    recordOneChunk();
  }, [recordOneChunk]);

  const stopCaptioning = useCallback(async () => {
    runningRef.current = false;
    setIsRecording(false);
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // already stopped, ignore
      }
      recordingRef.current = null;
    }
  }, []);

  return { isRecording, error, startCaptioning, stopCaptioning };
}
