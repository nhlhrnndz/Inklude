// hooks/useCaptionSession.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "../utils/socket";

export interface Caption {
  text: string;
  timestamp: number;
}

const MAX_CAPTIONS = 200;

export function useCaptionSession(
  sessionId: string | number | undefined,
  userId: string | number | undefined,
  role: "teacher" | "student" | "viewboard",
) {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [connected, setConnected] = useState(false);
  const [denied, setDenied] = useState<string | null>(null);
  // Live captioning is currently stopped (either paused by "End Session",
  // or the classroom was disabled — see classroomDisabled below).
  const [sessionEnded, setSessionEnded] = useState(false);
  // The classroom itself was disabled — this is terminal, no resuming.
  const [classroomDisabled, setClassroomDisabled] = useState(false);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    if (!sessionId) return;
    if (role !== "viewboard" && !userId) return;

    let cancelled = false;

    async function handleConnect() {
      setConnected(true);

      if (role === "viewboard") {
        // The Viewboard never sends its own userId — the server
        // decides who it is from the JWT, so it can verify ownership.
        const token = await AsyncStorage.getItem("token");
        if (cancelled) return;
        if (!token) {
          setDenied("Not logged in.");
          return;
        }
        socket.emit("join-viewboard", { sessionId, token });
      } else {
        socket.emit("join-session", { sessionId, userId, role });
      }
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handleNewCaption(caption: Caption) {
      setCaptions((prev) => [...prev, caption].slice(-MAX_CAPTIONS));
    }

    function handleDenied({ message }: { message?: string } = {}) {
      setDenied(message || "Could not join the Viewboard.");
    }

    // Live captioning stopped for this run — the classroom may still
    // be reused (teacher can go live again).
    function handleLiveEnded() {
      setSessionEnded(true);
    }

    // Teacher went live again in the same classroom.
    function handleLiveStarted() {
      setSessionEnded(false);
    }

    // Classroom permanently disabled — terminal, no resuming.
    function handleClassroomDisabled() {
      setSessionEnded(true);
      setClassroomDisabled(true);
    }

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("new-caption", handleNewCaption);
    socket.on("viewboard-denied", handleDenied);
    socket.on("live-ended", handleLiveEnded);
    socket.on("live-started", handleLiveStarted);
    socket.on("session-ended", handleClassroomDisabled);

    return () => {
      cancelled = true;
      socket.emit("leave-session", { sessionId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("new-caption", handleNewCaption);
      socket.off("viewboard-denied", handleDenied);
      socket.off("live-ended", handleLiveEnded);
      socket.off("live-started", handleLiveStarted);
      socket.off("session-ended", handleClassroomDisabled);
    };
  }, [sessionId, userId, role]);

  const sendCaption = useCallback(
    (text: string) => {
      const socket = socketRef.current;
      if (!sessionId || role === "viewboard") return;
      socket.emit("send-caption", {
        sessionId,
        text,
        timestamp: Date.now(),
      });
    },
    [sessionId, role],
  );

  const clearCaptions = useCallback(() => setCaptions([]), []);

  return {
    captions,
    connected,
    denied,
    sessionEnded,
    classroomDisabled,
    sendCaption,
    clearCaptions,
  };
}
