import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "@aegis/shared";
import { EVENT_CHANNEL, DECISION_CHANNEL, type ServerEvent, type DecisionRequest } from "@aegis/shared";
import {
  joinOrCreate,
  createBot,
  createPrivate,
  joinPrivateByCode,
  reconnect,
  connectionSlot,
  flushIntents,
  clearPendingIntents,
  type AegisRoom,
  type RoomSlot,
} from "./client";
import { intents } from "./intents";
import type { AegisJoinOptions } from "./types";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "error" | "closed";

/** WebSocket close code for a clean, consented close — not a candidate for reconnect. */
const WS_NORMAL_CLOSURE = 1000;
/** Reconnect attempts before giving up. Bounded backoff must fit the server grace window. */
const MAX_RECONNECT_ATTEMPTS = 8;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolves once the page is visible — immediately if it already is. */
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

/** Close only the exact decision the player has already answered. */
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

/** Reconcile the decision message with the latest synchronized pending-decision id. */
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
  // Decision messages and Colyseus state patches use separate channels. A new
  // message can arrive before a late patch that clears the previous decision;
  // only a decision already observed in synchronized state may be cleared by a
  // later mismatching/empty patch.
  if (current.confirmedDecisionId === current.decision.decisionId) {
    return { decision: undefined, confirmedDecisionId: undefined };
  }
  return current;
}

export interface UseRoomResult {
  room: AegisRoom | undefined;
  status: ConnectionStatus;
  state: GameState | undefined;
  events: ServerEvent[];
  decision: DecisionRequest | undefined;
  acknowledgeDecision: (decisionId: string) => void;
  error: string | undefined;
  /** This client's Colyseus session id; matches PlayerState.sessionId for our seat. */
  sessionId: string | undefined;
  /**
   * Monotonic counter bumped on every state patch. Because Colyseus mutates the same
   * GameState instance in place, consumers that memoize on the state reference (e.g.
   * a Pixi redraw effect) must also depend on this to react to each patch.
   */
  stateVersion: number;
  /** The private room code (non-empty only for the host of a private room). */
  roomCode: string;
}

export type MatchMode = "casual" | "bot" | "private_host" | "private_guest";

export interface MatchConfig {
  mode: MatchMode;
  roomCode?: string; // only for private_guest
}

function connectRoom(options: AegisJoinOptions, match?: MatchConfig): Promise<AegisRoom> {
  switch (match?.mode) {
    case "bot":
      return createBot(options);
    case "private_host":
      return createPrivate(options);
    case "private_guest":
      if (!match.roomCode) throw new Error("roomCode required for private guest");
      return joinPrivateByCode(match.roomCode, options);
    default:
      return joinOrCreate(options);
  }
}

/**
 * Subscribe to the AegisRoom: join on mount, surface the synchronized state, the
 * server event log, and the current decision request. The board renderer and React
 * HUD read from here; nothing here decides game legality (ARCHITECTURE.md 4).
 *
 * Colyseus mutates the same GameState instance in place on every patch, so a naive
 * `setState(room.state)` would no-op after the first patch (React bails on an equal
 * reference). We hold the live instance in a ref and force a re-render with a
 * monotonically increasing `version`; consumers read the always-current ref.
 */
export function useRoom(options: AegisJoinOptions, match?: MatchConfig, disabled = false): UseRoomResult {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [stateVersion, setVersion] = useState(0);
  const [events, setEvents] = useState<ServerEvent[]>([]);
  const [decision, setDecision] = useState<DecisionRequest>();
  const confirmedDecisionIdRef = useRef<string | undefined>(undefined);
  const answeredDecisionIdsRef = useRef(new Set<string>());
  const [error, setError] = useState<string>();
  const [sessionId, setSessionId] = useState<string>();
  const [roomCode, setRoomCode] = useState("");
  const roomRef = useRef<AegisRoom | undefined>(undefined);
  const roomSlotRef = useRef<RoomSlot>("legacy");
  const stateRef = useRef<GameState | undefined>(undefined);
  const readySentRef = useRef(false);

  // Re-join only when the identity-relevant options or match mode change.
  const optionsKey = JSON.stringify([options, match]);

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    confirmedDecisionIdRef.current = undefined;
    answeredDecisionIdsRef.current.clear();
    setDecision(undefined);

    // Register all room handlers. Called on the initial join and again on each
    // reconnected Room instance (client.reconnect returns a fresh Room).
    const bindRoom = (room: AegisRoom) => {
      roomRef.current = room;
      roomSlotRef.current = connectionSlot(room);
      setSessionId(room.sessionId);

      room.onStateChange((next) => {
        stateRef.current = next;
        // The client is mounted and has synchronized state; signal the server it is
        // ready to start (ARCHITECTURE.md / API-CONTRACT "ready"). Sent once per
        // fresh join so the match no longer races the client's asset loading.
        if (!readySentRef.current) {
          readySentRef.current = true;
          intents.ready(room);
        }
        // Pick up the private room code on the first state sync.
        if (next.roomCode) setRoomCode(next.roomCode);
        // Clear a stale local decision once the server is no longer waiting on it.
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
      });
      room.onMessage<ServerEvent>(EVENT_CHANNEL, (event) => {
        setEvents((prev) => [...prev.slice(-99), event]);
      });
      room.onMessage<DecisionRequest>(DECISION_CHANNEL, (req) => {
        if (answeredDecisionIdsRef.current.has(req.decisionId)) return;
        confirmedDecisionIdRef.current =
          stateRef.current?.pendingDecision?.decisionId === req.decisionId ? req.decisionId : undefined;
        setDecision(req);
      });
      room.onError((code, message) => {
        setStatus("error");
        setError(`${code}: ${message ?? "room error"}`);
      });
      room.onLeave((code) => {
        if (cancelled) return;
        // A clean close is the end of the line; anything else (server restart,
        // dropped socket) is an unexpected drop we try to recover from.
        if (code === WS_NORMAL_CLOSURE) {
          setStatus("closed");
          return;
        }
        void attemptReconnect();
      });
    };

    // Recover a dropped connection within the server's grace window. Reconnect
    // resumes the same seat; the server re-sends the pending decision and the
    // queued intents are flushed. If the room is gone (e.g. a deploy restarted
    // the server, discarding the in-memory match), give up and surface "closed".
    const attemptReconnect = async () => {
      const token = roomRef.current?.reconnectionToken;
      if (!token) {
        setStatus("closed");
        return;
      }
      setStatus("reconnecting");
      for (let attempt = 0; attempt < MAX_RECONNECT_ATTEMPTS; attempt++) {
        if (cancelled) return;
        // A hidden tab (mobile browser backgrounded) has a suspended network and
        // throttled timers, so attempts made there fail without meaning and the
        // bounded budget is spent before the player comes back. Hold the attempt
        // until the tab is visible again and restart the backoff — the server
        // grace window is what bounds the total wait.
        if (typeof document !== "undefined" && document.hidden) {
          await waitUntilVisible();
          attempt = 0;
        }
        if (cancelled) return;
        try {
          const next = await reconnect(token, roomSlotRef.current);
          if (cancelled) {
            void next.leave();
            return;
          }
          bindRoom(next);
          setStatus("connected");
          flushIntents(next);
          return;
        } catch {
          await delay(Math.min(1000 * 2 ** attempt, 8000));
        }
      }
      if (cancelled) return;
      clearPendingIntents();
      setStatus("closed");
      setError("Connection lost. We could not resume the match.");
    };

    connectRoom(options, match)
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
      void roomRef.current?.leave();
      roomRef.current = undefined;
      roomSlotRef.current = "legacy";
      stateRef.current = undefined;
      readySentRef.current = false;
      clearPendingIntents();
    };
    // optionsKey captures the meaningful contents of `options` + `match`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, optionsKey]);

  const acknowledgeDecision = useCallback((decisionId: string) => {
    answeredDecisionIdsRef.current.add(decisionId);
    setDecision((current) => {
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
    decision,
    acknowledgeDecision,
    error,
    sessionId,
    stateVersion,
    roomCode,
  };
}
