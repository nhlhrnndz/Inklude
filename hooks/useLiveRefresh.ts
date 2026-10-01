// hooks/useLiveRefresh.ts
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { AppState } from "react-native";

import { getSocket } from "../utils/socket";

type Options = {
  /** How often to quietly re-check while the screen is focused. */
  intervalMs?: number;
  /** Only react to socket events about this source (e.g. one thread id). */
  sourceId?: number | null;
  /** Which kind of notification should trigger a refresh. */
  sourceType?: string;
};

/**
 * Keeps a screen quietly up to date.
 *
 * - Runs `fetcher` when the screen gains focus, when a matching socket
 *   notification arrives, when the socket reconnects, when the app comes
 *   back to the foreground, and on a light timer while focused.
 * - Never overlaps requests. If something triggers a refresh while one
 *   is already running, it runs once more right after, so no update is
 *   missed.
 * - `fetcher` is expected to be silent (no spinners/toasts) and to skip
 *   state updates when nothing changed.
 */
export function useLiveRefresh(
  fetcher: () => Promise<void>,
  {
    intervalMs = 4000,
    sourceId = null,
    sourceType = "message_thread",
  }: Options = {},
) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const focusedRef = useRef(false);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);

  const run = useCallback(async () => {
    if (!focusedRef.current) return;

    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }

    inFlightRef.current = true;

    try {
      do {
        pendingRef.current = false;

        try {
          await fetcherRef.current();
        } catch {
          // Background refresh failures are intentionally silent.
        }
      } while (pendingRef.current && focusedRef.current);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      run();

      const socket = getSocket();

      const handleNew = (payload: {
        sourceType?: string | null;
        sourceId?: number | null;
      }) => {
        if (payload?.sourceType !== sourceType) return;

        if (
          sourceId != null &&
          payload.sourceId != null &&
          Number(payload.sourceId) !== Number(sourceId)
        ) {
          return;
        }

        run();
      };

      const handleConnect = () => {
        run();
      };

      socket.on("notification:new", handleNew);
      socket.on("connect", handleConnect);

      const timer = setInterval(() => {
        if (AppState.currentState === "active") run();
      }, intervalMs);

      const appStateSub = AppState.addEventListener("change", (state) => {
        if (state === "active") run();
      });

      return () => {
        focusedRef.current = false;
        clearInterval(timer);
        socket.off("notification:new", handleNew);
        socket.off("connect", handleConnect);
        appStateSub.remove();
      };
    }, [run, intervalMs, sourceId, sourceType]),
  );
}
