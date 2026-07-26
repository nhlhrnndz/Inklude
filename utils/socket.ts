// utils/socket.ts
import { io, Socket } from "socket.io-client";
import { API_URL } from "../constants/config";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    socket.on("connect_error", (err) => {
      console.log("⚠️ Socket connection error:", err.message);
    });
  }

  return socket;
}
