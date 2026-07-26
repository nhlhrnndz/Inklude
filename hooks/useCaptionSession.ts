// hooks/useCaptionSession.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "../utils/socket";

export interface Caption {
  text: string;
  timestamp: number;
}

export function useCaptionSession(
  sessionId: string | number | undefined,
  userId: string | number | undefined,
  role: "teacher" | "student",
) {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    if (!sessionId || !userId) return;

    function handleConnect() {
      setConnected(true);
      socket.emit("join-session", { sessionId, userId, role });
    }

    function handleNewCaption(caption: Caption) {
      setCaptions((prev) => [...prev, caption]);
    }

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("new-caption", handleNewCaption);

    return () => {
      socket.emit("leave-session", { sessionId });
      socket.off("connect", handleConnect);
      socket.off("new-caption", handleNewCaption);
    };
  }, [sessionId, userId, role]);

  const sendCaption = useCallback(
    (text: string) => {
      const socket = socketRef.current;
      if (!sessionId) return;
      socket.emit("send-caption", {
        sessionId,
        text,
        timestamp: Date.now(),
      });
    },
    [sessionId],
  );

  const clearCaptions = useCallback(() => setCaptions([]), []);

  return { captions, connected, sendCaption, clearCaptions };
}
