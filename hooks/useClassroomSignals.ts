// hooks/useClassroomSignals.ts
//
// Quiet student → teacher signals inside a live classroom
// ("Please repeat", "Please slow down", or a short typed note).
// The teacher answers out loud, so there is no reply channel.
import { useCallback, useEffect, useState } from "react";
import { getSocket } from "../utils/socket";

export interface StudentSignal {
  id: string;
  text: string;
  name: string;
  /** Client-side receive time, so expiry never depends on clock sync. */
  receivedAt: number;
}

export interface SignalResult {
  ok: boolean;
  reason?: string;
}

// How long a signal stays on the teacher's screen if not dismissed.
const SIGNAL_LIFETIME_MS = 15000;
const MAX_KEPT = 5;

// Student-side cooldown between sends (the server enforces a slightly
// shorter one as a backstop).
export const SIGNAL_COOLDOWN_SEC = 10;

/** Teacher side: collects incoming signals and expires old ones. */
export function useTeacherSignals(enabled: boolean) {
  const [signals, setSignals] = useState<StudentSignal[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();

    function handleSignal(signal: { id: string; text: string; name: string }) {
      setSignals((prev) =>
        [...prev, { ...signal, receivedAt: Date.now() }].slice(-MAX_KEPT),
      );
    }

    socket.on("student-signal", handleSignal);
    return () => {
      socket.off("student-signal", handleSignal);
    };
  }, [enabled]);

  const hasSignals = signals.length > 0;

  useEffect(() => {
    if (!hasSignals) return;

    const timer = setInterval(() => {
      const cutoff = Date.now() - SIGNAL_LIFETIME_MS;
      setSignals((prev) => {
        const next = prev.filter((s) => s.receivedAt > cutoff);
        return next.length === prev.length ? prev : next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasSignals]);

  const dismissAll = useCallback(() => setSignals([]), []);

  return { signals, dismissAll };
}

/** Student side: sends one signal and resolves with the server's answer. */
export function useSendSignal() {
  const send = useCallback(
    (text: string, name: string): Promise<SignalResult> =>
      new Promise((resolve) => {
        const socket = getSocket();

        if (!socket.connected) {
          resolve({ ok: false, reason: "offline" });
          return;
        }

        let done = false;
        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          resolve({ ok: false, reason: "timeout" });
        }, 5000);

        socket.emit(
          "student-signal",
          { text, name },
          (res: SignalResult | undefined) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(res ?? { ok: false, reason: "unknown" });
          },
        );
      }),
    [],
  );

  return { send };
}
