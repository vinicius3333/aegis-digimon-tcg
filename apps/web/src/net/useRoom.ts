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
  roomHandoffIdentity,
  roomHandoffEnabled,
  updateRoomHandoffIdentity,
  reconcileHandoffCommandReceipt,
  type AegisRoom,
  type RoomSlot,
} from "./client";
import { intents } from "./intents";
import { clearReconnectSession, loadReconnectSession, saveReconnectSession } from "./reconnectSession";
import { CurrentOwnerResolutionError } from "./liveRoomHandoffClient";
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
  /** Carries `seq`/`batch`/`stateVersion` (SequencedServerEvent) — every event over the wire
   * does — so a consumer that needs to correlate a live-log entry with the presentation queue's
   * progress (e.g. barrier-gating a combat prompt the same way a decision is) can read
   * `event.stateVersion` without re-deriving it from `batches`. */
  events: SequencedServerEvent[];
  /**
   * The same events grouped as the server resolved them, appended when a batch closes.
   * The presentation sequences by batch; `events` remains the flat log the HUD and the
   * match log read.
   */
  batches: readonly ServerBatch[];
  decision: DecisionRequest | undefined;
  acknowledgeDecision: (decisionId: string) => void;
  error: string | undefined;
  /** This client's Colyseus session id; matches PlayerState.sessionId for our seat. */
  sessionId: string | undefined;
  /**
   * Monotonic counter bumped on every state patch. Because Colyseus mutates the same
   * GameState instance in place, consumers that memoize on the state reference (e.g.
   * a Pixi redraw effect) must also depend on this to react to each patch.
   *
   * Named for the patch it counts, not for the server's `GameState.stateVersion`: the
   * server bumps that once per closed batch, while several patches can land inside one
   * batch and a patch can carry no batch at all.
   */
  patchVersion: number;
  /**
   * The board at each recent server revision, oldest first. `GameScreen` renders from the
   * one the presentation has reached rather than from the live state (presentedState.ts).
   */
  snapshots: readonly StateSnapshot[];
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
  // A resumable session means this mount reconnects instead of matchmaking, so the
  // very first render must not show the "finding a match" state.
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

    // Register all room handlers. Called on the initial join and again on each
    // reconnected Room instance (client.reconnect returns a fresh Room).
    const bindRoom = (room: AegisRoom) => {
      answeredDecisionsRef.current.clear();
      roomRef.current = room;
      roomSlotRef.current = connectionSlot(room);
      setSessionId(room.sessionId);
      const previouslySavedSession = loadReconnectSession();
      const previouslySavedIdentity = previouslySavedSession?.logicalSession;
      const currentIdentity = roomHandoffIdentity(room) ?? previouslySavedIdentity;
      let lastSavedIdentity = currentIdentity;
      saveReconnectSession({
        reconnectionToken: room.reconnectionToken,
        roomId: room.roomId,
        slot: roomSlotRef.current,
        savedAt: Date.now(),
        ...(currentIdentity ? { logicalSession: currentIdentity } : {}),
        ...(previouslySavedSession !== undefined &&
        currentIdentity !== undefined &&
        previouslySavedSession.logicalSession?.gameId === currentIdentity.gameId &&
        previouslySavedSession.resumeCredential &&
        (previouslySavedSession.resumeCredentialExpiresAt ?? 0) > Date.now()
          ? {
              resumeCredential: previouslySavedSession.resumeCredential,
              resumeCredentialExpiresAt: previouslySavedSession.resumeCredentialExpiresAt,
            }
          : {}),
      });
      let requestedCredentialGameId: string | undefined;
      const requestResumeCredential = (identity: { gameId: string } | undefined) => {
        if (!identity || !roomHandoffEnabled(room) || requestedCredentialGameId === identity.gameId) return;
        const saved = loadReconnectSession();
        if (
          saved?.logicalSession?.gameId === identity.gameId &&
          saved.resumeCredential &&
          (saved.resumeCredentialExpiresAt ?? 0) > Date.now()
        )
          return;
        requestedCredentialGameId = identity.gameId;
        room.send("requestRoomResumeCredential", { gameId: identity.gameId });
      };

      room.onMessage("roomResumeCredential", (message: unknown) => {
        if (typeof message !== "object" || message === null || Array.isArray(message)) return;
        const credential = message as {
          gameId?: unknown;
          resumeCredential?: unknown;
          ownerEpoch?: unknown;
          expiresAt?: unknown;
        };
        const identity = roomHandoffIdentity(room) ?? loadReconnectSession()?.logicalSession;
        if (
          !identity ||
          credential.gameId !== identity.gameId ||
          typeof credential.resumeCredential !== "string" ||
          credential.resumeCredential.length < 32 ||
          !Number.isSafeInteger(credential.ownerEpoch) ||
          !Number.isSafeInteger(credential.expiresAt) ||
          (credential.expiresAt as number) <= Date.now()
        )
          return;
        const updatedIdentity =
          updateRoomHandoffIdentity(room, {
            gameId: identity.gameId,
            ownerEpoch: credential.ownerEpoch as number,
          }) ?? identity;
        saveReconnectSession({
          reconnectionToken: room.reconnectionToken,
          roomId: room.roomId,
          slot: roomSlotRef.current,
          savedAt: Date.now(),
          logicalSession: updatedIdentity,
          resumeCredential: credential.resumeCredential,
          resumeCredentialExpiresAt: credential.expiresAt as number,
        });
        lastSavedIdentity = updatedIdentity;
        requestedCredentialGameId = updatedIdentity.gameId;
      });

      room.onStateChange((next) => {
        stateRef.current = next;
        const logicalSession =
          updateRoomHandoffIdentity(room, {
            gameId: typeof next.matchId === "string" ? next.matchId : undefined,
          }) ?? loadReconnectSession()?.logicalSession;
        if (!next.gameOver && logicalSession && !sameLogicalSession(logicalSession, lastSavedIdentity)) {
          const saved = loadReconnectSession();
          saveReconnectSession({
            reconnectionToken: room.reconnectionToken,
            roomId: room.roomId,
            slot: roomSlotRef.current,
            savedAt: Date.now(),
            logicalSession,
            ...(saved?.logicalSession?.gameId === logicalSession.gameId &&
            saved.resumeCredential &&
            (saved.resumeCredentialExpiresAt ?? 0) > Date.now()
              ? {
                  resumeCredential: saved.resumeCredential,
                  resumeCredentialExpiresAt: saved.resumeCredentialExpiresAt,
                }
              : {}),
          });
          lastSavedIdentity = logicalSession;
        }
        requestResumeCredential(logicalSession);
        if (next.gameOver) clearReconnectSession();
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
      room.onMessage("commandReceipt", (receipt: unknown) => {
        if (!reconcileHandoffCommandReceipt(room, receipt)) return;
        const logicalSession = roomHandoffIdentity(room);
        if (!logicalSession) return;
        if (sameLogicalSession(logicalSession, lastSavedIdentity)) return;
        const saved = loadReconnectSession();
        saveReconnectSession({
          reconnectionToken: room.reconnectionToken,
          roomId: room.roomId,
          slot: roomSlotRef.current,
          savedAt: Date.now(),
          logicalSession,
          ...(saved?.logicalSession?.gameId === logicalSession.gameId &&
          saved.resumeCredential &&
          (saved.resumeCredentialExpiresAt ?? 0) > Date.now()
            ? {
                resumeCredential: saved.resumeCredential,
                resumeCredentialExpiresAt: saved.resumeCredentialExpiresAt,
              }
            : {}),
        });
        lastSavedIdentity = logicalSession;
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
          clearReconnectSession();
          setStatus("closed");
          return;
        }
        void attemptReconnect();
      });
      requestResumeCredential(currentIdentity);
    };

    // Recover a dropped connection within the server's grace window. Reconnect
    // resumes the same seat; the server re-sends the pending decision and the
    // queued intents are flushed. If the room is gone (e.g. a deploy restarted
    // the server, discarding the in-memory match), give up and surface "closed".
    const attemptReconnect = async () => {
      const token = roomRef.current?.reconnectionToken;
      if (!token) {
        clearReconnectSession();
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
          const saved = loadReconnectSession() ?? {
            reconnectionToken: token,
            roomId: roomRef.current?.roomId ?? "",
            slot: roomSlotRef.current,
            savedAt: Date.now(),
          };
          const next = await resumeReconnectSession({ ...saved, reconnectionToken: token });
          if (cancelled) {
            void next.leave();
            return;
          }
          bindRoom(next);
          setStatus("connected");
          flushIntents(next);
          return;
        } catch (error) {
          if (isTerminalHandoffResumeError(error)) {
            clearReconnectSession();
            clearPendingIntents();
            setStatus("closed");
            setError("This match can no longer be resumed.");
            return;
          }
          await delay(Math.min(1000 * 2 ** attempt, 8000));
        }
      }
      if (cancelled) return;
      clearPendingIntents();
      clearReconnectSession();
      setStatus("closed");
      setError("Connection lost. We could not resume the match.");
    };

    // A page reload tears down the client while the server still holds the seat.
    // Resume that seat from the persisted token before considering matchmaking;
    // the two paths are sequential, so a fresh join never races the resume.
    const resumeOrConnect = async (): Promise<AegisRoom> => {
      const saved = loadReconnectSession();
      if (saved) {
        setStatus("reconnecting");
        for (let attempt = 0; attempt < MAX_RECONNECT_ATTEMPTS; attempt++) {
          if (cancelled) throw new Error("cancelled");
          if (typeof document !== "undefined" && document.hidden) {
            await waitUntilVisible();
            attempt = 0;
          }
          if (cancelled) throw new Error("cancelled");
          try {
            return await resumeReconnectSession(saved);
          } catch (error) {
            if (isTerminalHandoffResumeError(error)) {
              clearReconnectSession();
              throw error;
            }
            if (attempt < MAX_RECONNECT_ATTEMPTS - 1) {
              await delay(Math.min(1000 * 2 ** attempt, 8000));
            }
          }
        }
        clearReconnectSession();
        throw new Error("Connection lost. We could not resume the match.");
      }
      if (cancelled) throw new Error("cancelled");
      setStatus("connecting");
      return connectRoom(options, match);
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
      // Unmounting is a consented departure (exit to lobby, starting another match);
      // a reload never runs this, which is exactly when the token must survive.
      clearReconnectSession();
      void roomRef.current?.leave();
      roomRef.current = undefined;
      roomSlotRef.current = "legacy";
      stateRef.current = undefined;
      readySentRef.current = false;
      clearPendingIntents();
    };
    // A mounted GameScreen owns one connection lifecycle. Account/deck hydration
    // can change options after mount; restarting here would leave a resumed room,
    // erase its token and accidentally matchmake a second game. Starting another
    // match unmounts this screen and creates a fresh lifecycle with fresh options.
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

function sameLogicalSession(
  left: { gameId: string; ownerEpoch: number } | undefined,
  right: { gameId: string; ownerEpoch: number } | undefined,
): boolean {
  return left?.gameId === right?.gameId && left?.ownerEpoch === right?.ownerEpoch;
}

function isTerminalHandoffResumeError(error: unknown): error is CurrentOwnerResolutionError {
  return (
    error instanceof CurrentOwnerResolutionError &&
    ((error.status === 401 && error.code === "ROOM_RESUME_CREDENTIAL_INVALID") ||
      (error.status === 404 && error.code === "ROOM_SESSION_UNAVAILABLE"))
  );
}
