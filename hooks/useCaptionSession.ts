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
  const [sessionEnded, setSessionEnded] = useState(false);
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

    function handleSessionEnded() {
      setSessionEnded(true);
    }

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("new-caption", handleNewCaption);
    socket.on("viewboard-denied", handleDenied);
    socket.on("session-ended", handleSessionEnded);

    return () => {
      cancelled = true;
      socket.emit("leave-session", { sessionId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("new-caption", handleNewCaption);
      socket.off("viewboard-denied", handleDenied);
      socket.off("session-ended", handleSessionEnded);
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
    sendCaption,
    clearCaptions,
  };
}
