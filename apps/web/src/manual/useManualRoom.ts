import { useEffect, useRef, useState } from "react";
import {
  MANUAL_COMMAND,
  MANUAL_SNAPSHOT,
  MANUAL_ERROR,
  MANUAL_SYNC,
  MANUAL_RECONNECT_GRACE_SECONDS,
  type ManualAction,
  type ManualSnapshot,
} from "@aegis/shared";
import {
  createPrivate,
  joinOrCreate,
  joinPrivateByCode,
  connectionSlot,
  resumeReconnectSession,
  type AegisRoom,
} from "../net/client";
import {
  clearReconnectSession,
  loadReconnectSession,
  saveReconnectSession,
  type ReconnectSession,
} from "../net/reconnectSession";
import type { AegisJoinOptions } from "../net/types";

export type ManualStartMode = "manual" | "manual_host" | "manual_guest";
export function useManualRoom(options: AegisJoinOptions, mode: ManualStartMode, code?: string) {
  const [snapshot, setSnapshot] = useState<ManualSnapshot>();
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState<string>();
  const roomRef = useRef<AegisRoom | undefined>(undefined);
  const snapshotRef = useRef<ManualSnapshot | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  function updatePending(value: boolean) {
    pendingRef.current = value;
    setPending(value);
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let session: ReconnectSession | undefined;
    let reconnecting = false;
    const remember = (room: AegisRoom) => {
      session = {
        reconnectionToken: room.reconnectionToken,
        roomId: room.roomId,
        slot: connectionSlot(room),
        savedAt: Date.now(),
        manual: true,
      };
      saveReconnectSession(session);
    };
    const bind = (room: AegisRoom) => {
      if (cancelled) {
        void room.leave();
        return;
      }
      roomRef.current = room;
      room.reconnection.enabled = false;
      remember(room);
      setStatus("connected");
      setError(undefined);
      updatePending(false);
      room.onMessage<ManualSnapshot>(MANUAL_SNAPSHOT, (next) => {
        if (cancelled) return;
        snapshotRef.current = next;
        setSnapshot(next);
        updatePending(false);
        if (next.phase === "over") clearReconnectSession();
      });
      room.onMessage<string>(MANUAL_ERROR, (message) => {
        if (!cancelled) {
          setError(message);
          updatePending(false);
        }
      });
      room.onError((_code, message) => {
        if (!cancelled) setError(message ?? "Connection error");
      });
      room.onLeave((closeCode) => {
        if (cancelled) return;
        updatePending(false);
        if (closeCode === 1000 || closeCode === 4000) {
          clearReconnectSession();
          setStatus("closed");
          return;
        }
        void recover();
      });
      room.send(MANUAL_SYNC);
    };
    const recover = async () => {
      if (reconnecting || !session || cancelled) return;
      reconnecting = true;
      setStatus("reconnecting");
      const deadline = Date.now() + MANUAL_RECONNECT_GRACE_SECONDS * 1000;
      while (Date.now() < deadline) {
        if (cancelled) break;
        try {
          const resumed = await resumeReconnectSession(session);
          reconnecting = false;
          bind(resumed);
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      reconnecting = false;
      if (!cancelled) {
        clearReconnectSession();
        setStatus("error");
        setError("Could not resume the manual table");
      }
    };
    const connect = async () => {
      const saved = loadReconnectSession();
      if (saved?.manual) {
        session = saved;
        await recover();
        return;
      }
      const join = { ...options, manualMode: true, ranked: false, bestOf: 1 as const, matchTimer: false };
      try {
        const room =
          mode === "manual_host"
            ? await createPrivate(join)
            : mode === "manual_guest"
              ? await joinPrivateByCode(code ?? "", join)
              : await joinOrCreate(join);
        bind(room);
      } catch (reason) {
        if (!cancelled) {
          setStatus("error");
          setError(reason instanceof Error ? reason.message : "Connection error");
        }
      }
    };
    void connect();
    timer = setInterval(() => {
      if (session && roomRef.current?.connection.isOpen && snapshotRef.current?.phase !== "over") {
        session.savedAt = Date.now();
        saveReconnectSession(session);
      }
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      const room = roomRef.current;
      roomRef.current = undefined;
      if (room) void room.leave();
    };
  }, [options, mode, code]);

  function send(action: ManualAction) {
    const room = roomRef.current;
    const state = snapshotRef.current;
    if (!room?.connection.isOpen || !state || status !== "connected" || pendingRef.current) return;
    setError(undefined);
    updatePending(true);
    room.send(MANUAL_COMMAND, { revision: state.revision, action });
  }
  function leave() {
    clearReconnectSession();
    void roomRef.current?.leave();
  }
  return { snapshot, status, error, pending, send, leave };
}
