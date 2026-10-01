import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "@aegis/shared";
import { EVENT_CHANNEL, DECISION_CHANNEL, type SequencedServerEvent, type DecisionRequest } from "@aegis/shared";
import { emptyBatchInbox, receiveServerEvent, type BatchInbox, type ServerBatch } from "./serverBatches";
import { recordSnapshot, type StateSnapshot } from "./presentedState";
import {
  joinOrCreate,
  createBot,
  createPrivate,
  joinPrivateByCode,
  resumeReconnectSession,
  connectionSlot,
  flushIntents,
  clearPendingIntents,
  type AegisRoom,
  type RoomSlot,
} from "./client";
import { intents } from "./intents";
import {
  RECONNECT_GRACE_MS,
  clearReconnectSession,
  loadReconnectSession,
  saveReconnectSession,
  type ReconnectSession,
} from "./reconnectSession";
import { ResumeCancelledError, resumeSeat } from "./resumeSeat";
import type { AegisJoinOptions } from "./types";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "error" | "closed";

const WS_NORMAL_CLOSURE = 1000;
/** Grace runs from the drop, not the join, so a live seat keeps its saved session fresh. */
const SESSION_HEARTBEAT_MS = 5_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitUntilVisible = (): Promise<void> => {
  if (typeof document === "undefined" || !document.hidden) return Promise.resolve();
  return new Promise((resolve) => {
    const onVisible = () => {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", onVisible);
      resolve();
    };
    document.addEventListener("visibilitychange", onVisible);
  });
};

export interface DecisionSyncState {
  decision: DecisionRequest | undefined;
  confirmedDecisionId: string | undefined;
}

export function acknowledgeDecisionResponse({
  current,
  decisionId,
}: {
  current: DecisionSyncState;
  decisionId: string;
}): DecisionSyncState {
  if (current.decision?.decisionId !== decisionId) return current;
  return { decision: undefined, confirmedDecisionId: undefined };
}

export function reconcileDecisionPatch({
  current,
  pendingDecisionId,
}: {
  current: DecisionSyncState;
  pendingDecisionId: string | undefined;
}): DecisionSyncState {
  if (current.decision === undefined) {
    return { decision: undefined, confirmedDecisionId: undefined };
  }
  if (pendingDecisionId === current.decision.decisionId) {
    return {
      decision: current.decision,
      confirmedDecisionId: current.decision.decisionId,
    };
  }
  // Decisions and patches use separate channels, so a late patch can trail a new decision.
  // Only a decision already seen in synchronized state may be cleared.
  if (current.confirmedDecisionId === current.decision.decisionId) {
    return { decision: undefined, confirmedDecisionId: undefined };
  }
  return current;
}

export interface UseRoomResult {
  room: AegisRoom | undefined;
  status: ConnectionStatus;
  state: GameState | undefined;
  events: SequencedServerEvent[];
  /** `events` grouped by server batch; the presentation sequences by these. */
  batches: readonly ServerBatch[];
  decision: DecisionRequest | undefined;
  acknowledgeDecision: (decisionId: string) => void;
  error: string | undefined;
  sessionId: string | undefined;
  /**
   * Bumped on every patch. Colyseus mutates GameState in place, so memoize on this, not on
   * the state reference. Unlike `GameState.stateVersion`, it is not per batch.
   */
  patchVersion: number;
  /** The board at each recent server revision, oldest first (presentedState.ts). */
  snapshots: readonly StateSnapshot[];
  /** Non-empty only for the host of a private room. */
  roomCode: string;
}

export type MatchMode = "casual" | "bot" | "private_host" | "private_guest";

export interface MatchConfig {
  mode: MatchMode;
  /** The code to join as a guest, or to reopen as the host after a finished private game. */
  roomCode?: string;
  /** A guest back in a private room waits here until the host has reopened it. */
  waitForHost?: boolean;
}

const HOST_REOPEN_POLL_MS = 2000;
const HOST_REOPEN_WAIT_MS = 10 * 60 * 1000;

function isMissingRoom(error: unknown): boolean {
  return error instanceof Error && /room not (found|available)/.test(error.message);
}

async function joinWhenHostReopens(
  code: string,
  options: AegisJoinOptions,
  isCancelled: () => boolean,
): Promise<AegisRoom> {
  const deadline = Date.now() + HOST_REOPEN_WAIT_MS;
  for (;;) {
    try {
      return await joinPrivateByCode(code, options);
    } catch (error) {
      if (!isMissingRoom(error) || Date.now() >= deadline || isCancelled()) throw error;
    }
    await delay(HOST_REOPEN_POLL_MS);
  }
}

function connectRoom(
  options: AegisJoinOptions,
  match: MatchConfig | undefined,
  isCancelled: () => boolean,
): Promise<AegisRoom> {
  switch (match?.mode) {
    case "bot":
      return createBot(options);
    case "private_host":
      return createPrivate(match.roomCode ? { ...options, roomCode: match.roomCode } : options);
    case "private_guest":
      if (!match.roomCode) throw new Error("roomCode required for private guest");
      if (match.waitForHost) return joinWhenHostReopens(match.roomCode, options, isCancelled);
      return joinPrivateByCode(match.roomCode, options);
    default:
      return joinOrCreate(options);
  }
}

/**
 * The live GameState sits in a ref because Colyseus mutates it in place and React would
 * skip `setState` on the same reference; `patchVersion` forces each re-render.
 */
export function useRoom(options: AegisJoinOptions, match?: MatchConfig, disabled = false): UseRoomResult {
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    !disabled && loadReconnectSession() ? "reconnecting" : "connecting",
  );
  const [patchVersion, setVersion] = useState(0);
  const [snapshots, setSnapshots] = useState<readonly StateSnapshot[]>([]);
  const [events, setEvents] = useState<SequencedServerEvent[]>([]);
  const [inbox, setInbox] = useState<BatchInbox>(emptyBatchInbox);
  const [decision, setDecision] = useState<DecisionRequest>();
  const confirmedDecisionIdRef = useRef<string | undefined>(undefined);
  const answeredDecisionsRef = useRef(new Map<string, DecisionRequest>());
  const [error, setError] = useState<string>();
  const [sessionId, setSessionId] = useState<string>();
  const [roomCode, setRoomCode] = useState("");
  const roomRef = useRef<AegisRoom | undefined>(undefined);
  const roomSlotRef = useRef<RoomSlot>("legacy");
  const stateRef = useRef<GameState | undefined>(undefined);
  const readySentRef = useRef(false);

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    confirmedDecisionIdRef.current = undefined;
    answeredDecisionsRef.current.clear();
    setDecision(undefined);

    let stopHeartbeat = () => {};

    const bindRoom = (room: AegisRoom) => {
      // attemptReconnect owns recovery; the SDK's own reconnection would race it for the seat.
      room.reconnection.enabled = false;
      answeredDecisionsRef.current.clear();
      roomRef.current = room;
      roomSlotRef.current = connectionSlot(room);
      setSessionId(room.sessionId);
      const session: ReconnectSession = {
        reconnectionToken: room.reconnectionToken,
        roomId: room.roomId,
        slot: roomSlotRef.current,
        savedAt: Date.now(),
      };
      let gameOver = false;
      const stampSession = () => {
        if (cancelled || gameOver || roomRef.current !== room || !room.connection.isOpen) return;
        saveReconnectSession({ ...session, savedAt: Date.now() });
      };
      stampSession();
      stopHeartbeat();
      const heartbeat = setInterval(stampSession, SESSION_HEARTBEAT_MS);
      stopHeartbeat = () => clearInterval(heartbeat);

      room.onStateChange((next) => {
        stateRef.current = next;
        if (next.gameOver) {
          gameOver = true;
          stopHeartbeat();
          clearReconnectSession();
        }
        // Once per join, so the match start does not race the client's asset loading.
        if (!readySentRef.current) {
          readySentRef.current = true;
          intents.ready(room);
        }
        if (next.roomCode) setRoomCode(next.roomCode);
        const pending = next.pendingDecision;
        setDecision((current) => {
          const reconciled = reconcileDecisionPatch({
            current: {
              decision: current,
              confirmedDecisionId: confirmedDecisionIdRef.current,
            },
            pendingDecisionId: pending?.decisionId,
          });
          confirmedDecisionIdRef.current = reconciled.confirmedDecisionId;
          return reconciled.decision;
        });
        setVersion((v) => v + 1);
        setSnapshots((previous) => recordSnapshot(previous, next));
      });
      room.onMessage<SequencedServerEvent>(EVENT_CHANNEL, (event) => {
        if (event.kind === "actionRejected" && event.decisionId) {
          const rejected = answeredDecisionsRef.current.get(event.decisionId);
          answeredDecisionsRef.current.delete(event.decisionId);
          if (rejected && stateRef.current?.pendingDecision?.decisionId === rejected.decisionId) {
            setDecision((current) => {
              if (current && current.decisionId !== rejected.decisionId) return current;
              confirmedDecisionIdRef.current = rejected.decisionId;
              return rejected;
            });
          }
        }
        // `batchClosed` is a stream boundary and narrates nothing, so it stays out of the log.
        if (event.kind !== "batchClosed") setEvents((prev) => [...prev.slice(-99), event]);
        setInbox((prev) => receiveServerEvent(prev, event));
      });
      room.onMessage<DecisionRequest>(DECISION_CHANNEL, (req) => {
        if (answeredDecisionsRef.current.has(req.decisionId)) return;
        confirmedDecisionIdRef.current =
          stateRef.current?.pendingDecision?.decisionId === req.decisionId ? req.decisionId : undefined;
        setDecision(req);
      });
      room.onError((code, message) => {
        setStatus("error");
        setError(`${code}: ${message ?? "room error"}`);
      });
      room.onLeave((code) => {
        stopHeartbeat();
        if (cancelled) return;
        if (code === WS_NORMAL_CLOSURE) {
          clearReconnectSession();
          setStatus("closed");
          return;
        }
        void attemptReconnect(Date.now() + RECONNECT_GRACE_MS);
      });
    };

    const attemptReconnect = async (deadline: number) => {
      const token = roomRef.current?.reconnectionToken;
      if (!token) {
        clearReconnectSession();
        setStatus("closed");
        return;
      }
      setStatus("reconnecting");
      const saved = loadReconnectSession() ?? {
        reconnectionToken: token,
        roomId: roomRef.current?.roomId ?? "",
        slot: roomSlotRef.current,
        savedAt: Date.now(),
      };
      let next: AegisRoom;
      try {
        next = await resumeSeat({
          resume: () => resumeReconnectSession({ ...saved, reconnectionToken: token }),
          deadline,
          isCancelled: () => cancelled,
          waitUntilVisible,
        });
      } catch (error) {
        if (cancelled || error instanceof ResumeCancelledError) return;
        clearPendingIntents();
        clearReconnectSession();
        setStatus("closed");
        setError(error instanceof Error ? error.message : String(error));
        return;
      }
      if (cancelled) {
        void next.leave();
        return;
      }
      bindRoom(next);
      setStatus("connected");
      flushIntents(next);
    };

    const resumeOrConnect = async (): Promise<AegisRoom> => {
      const saved = loadReconnectSession();
      if (saved) {
        setStatus("reconnecting");
        try {
          return await resumeSeat({
            resume: () => resumeReconnectSession(saved),
            deadline: saved.savedAt + RECONNECT_GRACE_MS,
            isCancelled: () => cancelled,
            waitUntilVisible,
          });
        } catch (error) {
          if (!(error instanceof ResumeCancelledError)) clearReconnectSession();
          throw error;
        }
      }
      if (cancelled) throw new Error("cancelled");
      setStatus("connecting");
      return connectRoom(options, match, () => cancelled);
    };

    resumeOrConnect()
      .then((room) => {
        if (cancelled) {
          void room.leave();
          return;
        }
        bindRoom(room);
        setStatus("connected");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
      stopHeartbeat();
      // A reload never runs this cleanup, so only a deliberate exit forgets the seat.
      clearReconnectSession();
      void roomRef.current?.leave();
      roomRef.current = undefined;
      roomSlotRef.current = "legacy";
      stateRef.current = undefined;
      readySentRef.current = false;
      clearPendingIntents();
    };
    // Options can change after mount (account/deck hydration); restarting would drop a
    // resumed seat and matchmake a second game. A new match remounts with fresh options.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const acknowledgeDecision = useCallback((decisionId: string) => {
    setDecision((current) => {
      if (current?.decisionId === decisionId) answeredDecisionsRef.current.set(decisionId, current);
      const acknowledged = acknowledgeDecisionResponse({
        current: { decision: current, confirmedDecisionId: confirmedDecisionIdRef.current },
        decisionId,
      });
      confirmedDecisionIdRef.current = acknowledged.confirmedDecisionId;
      return acknowledged.decision;
    });
  }, []);

  return {
    room: roomRef.current,
    status,
    state: stateRef.current,
    events,
    batches: inbox.batches,
    decision,
    acknowledgeDecision,
    error,
    sessionId,
    patchVersion,
    snapshots,
    roomCode,
  };
}
