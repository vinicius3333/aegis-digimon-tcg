/* The in-game board — the design's letterboxed board layout, driven entirely by
   the synchronized GameState and wired to the server through typed intents. The
   client owns zero rules: every action is an intent the server validates, and the
   board is a pure render of what the server sends back (ARCHITECTURE.md §4). */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CardKind,
  Phase,
  digiXrosRequirementFor,
  digiXrosZoneExpanderFor,
  getCardDefinition,
  type AttackTarget,
  type DecisionResponse,
  type DigiXrosRequirement,
  type Permanent,
  type ServerEvent,
} from "@aegis/shared";
import { rejectionMessage } from "../rejectionMessages";
import { useTranslation } from "../i18n";
import { useRoom, type MatchMode, type UseRoomResult } from "../net/useRoom";
import { intents } from "../net/intents";
import { joinWithBot } from "../net/client";
import type { StartMode } from "../screens/Lobby";
import type { AegisJoinOptions } from "../net/types";
import { Avatar, Badge, Button, Logo, type Screen } from "../design/primitives";
import type { DigimonWorldAvatarId } from "../account/avatars";
import { CardFull } from "../design/cards";
import { Icons } from "../design/icons";
import type { ColorName } from "../design/theme";
import { playSound } from "../design/sound";
import { areActionConfirmationsEnabled } from "../design/actionConfirmation";
import { useBattlefieldStyle } from "../design/battlefield";
import "./game.css";
import {
  AttackArrow,
  BreedingSlot,
  Hand,
  HAND_CARD_WIDTH,
  HAND_CARD_WIDTH_COMPACT,
  MemoryGauge,
  PermanentView,
  Pile,
  type HandEntry,
} from "./boardPieces";
import {
  bothSeated,
  activeBlockWindow,
  activeCounterWindow,
  buildInstanceIndex,
  decisionCardColors,
  differentColorsAllowCandidate,
  decisionSourceCounts,
  decisionPermanentDetails,
  decisionVisibleCards,
  distinctCardIdsAllow,
  findDnaMaterialCombination,
  attackTargetIdsOf,
  attackTargetsOf,
  buildMatchLog,
  canAttackPlayerWith,
  canAttackWith,
  canVortexAttackWith,
  displayMemory,
  eventsAfter,
  findPermanentInState,
  getDigivolveCostOptions,
  handCardEvolutionRoute,
  parseActivatable,
  decisionEffectSource,
  otherSeat,
  instanceCardId,
  permCardId,
  playButtonLabel,
  playerColorKey,
  viewerSeatOf,
  type EvoCostOption,
  type LogLine,
  canMoveFromBreeding,
  canUseBreedingAction,
  type ActivatableEntry,
} from "./boardModel";
import {
  AllianceOverlay,
  ActionConfirmationOverlay,
  BarrierOverlay,
  BlockOverlay,
  BreedingOverlay,
  CardActionMenu,
  CardZoomOverlay,
  CounterOverlay,
  DecisionOverlay,
  OpponentPermanentInspector,
  RecoveryToast,
  DigiXrosMaterialOverlay,
  EvadeOverlay,
  EvoCostChoiceOverlay,
  EffectClauseToast,
  GameOverOverlay,
  MulliganOverlay,
  SecurityOverlay,
  StackViewerOverlay,
  TrashViewerOverlay,
  WaitingOverlay,
  type DigiXrosCandidate,
  type DigiXrosEligibleExpander,
  type StackCard,
} from "./overlays";
import { MatchHistorySheet, OpponentActionFeed } from "./OpponentActionFeedView";
import { hasOpenCombatPrompt } from "./opponentActionFeed";
import { ownPermanentTapDestination } from "./ownPermanentStack";
import { useOpponentActionFeed } from "./useOpponentActionFeed";

const PHASES: Phase[] = [Phase.Active, Phase.Draw, Phase.Breeding, Phase.Main, Phase.End];

function useMediaQuery(mediaQuery: string): boolean {
  const [matches, setMatches] = useState(
    () =>
      typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(mediaQuery).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(mediaQuery);
    const update = () => setMatches(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [mediaQuery]);
  return matches;
}

/** Phone layout: touch sheets, compact everything. Mirrors `@media (width < 600px)`. */
const NARROW_LAYOUT_QUERY = "(width < 600px)";
/**
 * Tablet and split-screen widths. The board keeps its pointer interactions but the
 * piles shrink, because the sidebar moves under the board and leaves the rails too
 * short to hold four full-size piles.
 */
const COMPACT_PILES_QUERY = "(width < 960px)";
/**
 * A board this short cannot show a full-size Digimon in each battle row, so the
 * permanents drop to their compact size rather than being clipped by the row.
 */
const SHORT_BOARD_QUERY = "(height < 820px)";
/**
 * Split-screen and small laptops, where game.css narrows the pile rails to 104px.
 * The rail breeding slot must shrink with them or its permanent (1.16× the slot)
 * paints over the battle area.
 */
const NARROW_RAIL_QUERY = "(width < 1240px)";
/** Slot width whose 1.16× permanent exactly fits the 104px rail's 84px content box. */
const NARROW_RAIL_SLOT_WIDTH = 72;

/** Pointer travel, in px, that separates a tap from a drag. */
const DRAG_THRESHOLD = 6;

/**
 * `deferred` marks a touch gesture whose direction is not yet known: the pointer is
 * left to the browser until `move` decides between a sideways swipe (scroll the row)
 * and a drag (play / attack). `capture` is the element to capture onto once it does.
 */
type DragOrigin = { deferred?: boolean; capture?: Element };

type DragState =
  | ({
      kind: "play";
      index: number;
      instanceId: string;
      cardId: string;
      x: number;
      y: number;
      ox: number;
      oy: number;
      started: boolean;
    } & DragOrigin)
  | ({
      kind: "attack";
      permId: string;
      cardId: string;
      x: number;
      y: number;
      ox: number;
      oy: number;
      started: boolean;
    } & DragOrigin);

export function GameScreen({
  joinOptions,
  identityColor,
  identityAvatarId,
  identityAvatarUrl,
  startMode = "casual",
  roomCode,
  onExit,
  demoConnection,
}: {
  joinOptions: AegisJoinOptions;
  identityColor: ColorName;
  identityAvatarId?: DigimonWorldAvatarId | null;
  identityAvatarUrl?: string | null;
  startMode?: StartMode;
  roomCode?: string;
  onExit: (screen: Screen) => void;
  demoConnection?: Pick<
    UseRoomResult,
    "room" | "status" | "state" | "events" | "decision" | "acknowledgeDecision" | "error" | "sessionId" | "roomCode"
  > & {
    acknowledgeBlockWindow?: (blockerPermanentId?: string) => void;
  };
}) {
  const { t } = useTranslation();
  const actionConfirmationsEnabled = areActionConfirmationsEnabled();
  const narrowGameLayout = useMediaQuery(NARROW_LAYOUT_QUERY);
  const compactPiles = useMediaQuery(COMPACT_PILES_QUERY);
  const shortBoard = useMediaQuery(SHORT_BOARD_QUERY);
  const narrowRail = useMediaQuery(NARROW_RAIL_QUERY);
  const matchConfig = useMemo(() => {
    if (startMode === "casual" || startMode === "ranked") return undefined;
    if (startMode === "bot") return { mode: "bot" as MatchMode };
    return { mode: startMode, roomCode };
  }, [startMode, roomCode]);
  const roomOptions = useMemo(() => ({ ...joinOptions, ranked: startMode === "ranked" }), [joinOptions, startMode]);
  const liveConnection = useRoom(roomOptions, matchConfig, demoConnection !== undefined);
  const {
    room,
    status,
    state,
    events,
    decision,
    acknowledgeDecision,
    error,
    sessionId,
    roomCode: hostRoomCode,
  } = demoConnection ?? liveConnection;
  const viewerSeat = useMemo(() => viewerSeatOf(state, sessionId), [state, sessionId]);

  const vsBot = startMode === "bot";

  const botCalledRef = useRef(false);
  const [botError, setBotError] = useState<string>();
  useEffect(() => {
    if (!vsBot || botCalledRef.current || !room || status !== "connected") return;
    botCalledRef.current = true;
    void joinWithBot(room.roomId).catch((botJoinError: unknown) => {
      console.error("[BOT_JOIN_CLIENT] failed", {
        roomId: room.roomId,
        error: botJoinError instanceof Error ? botJoinError.message : String(botJoinError),
      });
      setBotError(t("game.botConnectionFailedDetail"));
    });
  }, [vsBot, room, status, t]);

  const [handSel, setHandSel] = useState<string | null>(null); // selected hand instanceId
  const [handPreview, setHandPreview] = useState<string | null>(null); // instanceId shown in the mobile tap preview
  const [selPerm, setSelPerm] = useState<string | null>(null); // selected attacker permanentId
  const [vortexMode, setVortexMode] = useState(false); // the selected attack is a ＜Vortex＞ declaration
  const [cardMenu, setCardMenu] = useState<{ permanentId: string; side: "you" | "opp"; x: number; y: number } | null>(
    null,
  );
  const [stackView, setStackView] = useState<string | null>(null); // permanentId whose stack modal is open
  const [trashView, setTrashView] = useState<"you" | "opp" | null>(null); // which player's trash modal is open
  const [picks, setPicks] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [turnTransition, setTurnTransition] = useState<{
    endingSeat: number;
    nextSeat: number;
    turnCount: number;
  } | null>(null);
  const [secReveal, setSecReveal] = useState<{ cardId: string; resolution: string } | null>(null);
  const [recoveryToast, setRecoveryToast] = useState<{ seat: number; amount: number; key: number } | null>(null);
  const [effectNotice, setEffectNotice] = useState<{
    cardId: string;
    timing?: string;
    description?: string;
    key: string;
  } | null>(null);
  const [oppInspector, setOppInspector] = useState<{ permanentId: string; x: number; y: number } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastNoticeEventRef = useRef<ServerEvent | undefined>(undefined);
  const securityToastTimerRef = useRef<number | undefined>(undefined);
  const recoveryToastTimerRef = useRef<number | undefined>(undefined);
  const effectNoticeTimerRef = useRef<number | undefined>(undefined);
  const inspectorTimerRef = useRef<number | undefined>(undefined);
  const [evoCostChoice, setEvoCostChoice] = useState<{
    handInstanceId: string;
    permanentId: string;
    handCardId: string;
    baseName: string;
    options: EvoCostOption[];
  } | null>(null);
  const [digiXrosPick, setDigiXrosPick] = useState<{
    instanceId: string;
    cardId: string;
    requirements: DigiXrosRequirement[];
    candidates: DigiXrosCandidate[];
    lockedCandidates: DigiXrosCandidate[];
    eligibleExpanders: DigiXrosEligibleExpander[];
  } | null>(null);
  const [actionConfirm, setActionConfirm] = useState<
    | { kind: "play"; instanceId: string; cardId: string }
    | { kind: "digivolve"; instanceId: string; cardId: string; permanentId: string; baseCardId: string }
    | { kind: "dna"; instanceId: string; cardId: string; materialPermanentIds: string[]; normalPermanentId?: string }
    | null
  >(null);

  const dragRef = useRef<DragState | null>(null);
  const [drag, setDragState] = useState<DragState | null>(null);
  const setDrag = (d: DragState | null) => {
    dragRef.current = d;
    setDragState(d);
  };

  const battlefield = useBattlefieldStyle();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const permRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const yourSecRef = useRef<HTMLDivElement | null>(null);
  const oppSecRef = useRef<HTMLDivElement | null>(null);
  const [arrow, setArrow] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);

  const handleTapRef = useRef<((d: DragState) => void) | null>(null);
  const handleDropRef = useRef<((d: DragState, cx: number, cy: number) => void) | null>(null);

  const ping = (message: string) => {
    playSound("error");
    setFlash(message);
    window.setTimeout(() => setFlash(null), 1800);
  };
  const clearSel = () => {
    setHandSel(null);
    setSelPerm(null);
    setVortexMode(false);
  };

  const feedPaused = Boolean(
    decision ||
    handPreview ||
    cardMenu ||
    stackView ||
    trashView ||
    evoCostChoice ||
    digiXrosPick ||
    actionConfirm ||
    secReveal ||
    historyOpen ||
    hasOpenCombatPrompt(events) ||
    state?.gameOver,
  );
  const opponentFeed = useOpponentActionFeed({
    events,
    viewerSeat,
    paused: feedPaused,
    trailCapacity: narrowGameLayout ? 1 : 2,
    matchKey: room?.roomId ?? roomCode ?? "pending-match",
  });

  // Surface server rejections as a transient toast.
  useEffect(() => {
    const previous = lastNoticeEventRef.current;
    const fresh = eventsAfter(events, previous);
    lastNoticeEventRef.current = events.at(-1);
    const rejection = [...fresh].reverse().find((event) => event.kind === "actionRejected");
    const securityCheck = [...fresh].reverse().find((event) => event.kind === "securityChecked");
    const recovery = [...fresh].reverse().find((event) => event.kind === "securityRecovered");
    const resolvedEffect = [...fresh]
      .reverse()
      .find((event) => event.kind === "effectResolved" && event.seat === viewerSeat);
    const turnEnd = [...fresh].reverse().find((event) => event.kind === "turnEnded");
    if (rejection?.kind === "actionRejected") ping(rejectionMessage(rejection.reason, t));
    if (securityCheck?.kind === "securityChecked") {
      if (securityToastTimerRef.current) window.clearTimeout(securityToastTimerRef.current);
      setSecReveal({ cardId: securityCheck.revealedCardId, resolution: securityCheck.resolution });
      securityToastTimerRef.current = window.setTimeout(() => setSecReveal(null), 4500);
    }
    if (recovery?.kind === "securityRecovered") {
      if (recoveryToastTimerRef.current) window.clearTimeout(recoveryToastTimerRef.current);
      setRecoveryToast({ seat: recovery.seat, amount: recovery.amount, key: Date.now() });
      recoveryToastTimerRef.current = window.setTimeout(() => setRecoveryToast(null), 2800);
    }
    if (resolvedEffect?.kind === "effectResolved") {
      if (effectNoticeTimerRef.current) window.clearTimeout(effectNoticeTimerRef.current);
      setEffectNotice({
        cardId: resolvedEffect.sourceCardId,
        timing: resolvedEffect.timing,
        description: resolvedEffect.description,
        key: `${resolvedEffect.effectKey}-${events.length}`,
      });
      effectNoticeTimerRef.current = window.setTimeout(() => setEffectNotice(null), 2800);
    }
    if (turnEnd?.kind === "turnEnded") {
      setTurnTransition({ endingSeat: turnEnd.endingSeat, nextSeat: turnEnd.nextSeat, turnCount: turnEnd.turnCount });
      window.setTimeout(() => setTurnTransition(null), 2500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  useEffect(
    () => () => {
      if (securityToastTimerRef.current) window.clearTimeout(securityToastTimerRef.current);
      if (recoveryToastTimerRef.current) window.clearTimeout(recoveryToastTimerRef.current);
      if (effectNoticeTimerRef.current) window.clearTimeout(effectNoticeTimerRef.current);
      if (inspectorTimerRef.current) window.clearTimeout(inspectorTimerRef.current);
    },
    [],
  );

  // Clear local selections whenever a decision opens or the turn flips.
  useEffect(() => {
    clearSel();
    setHandPreview(null);
    setCardMenu(null);
    setStackView(null);
    setTrashView(null);
    setDigiXrosPick(null);
    setOppInspector(null);
  }, [decision?.decisionId, state?.turnSeat]);

  // Attack arrow: from the selected attacker to the opponent's security pile.
  useEffect(() => {
    if (!selPerm) {
      setArrow(null);
      return;
    }
    const measure = () => {
      const b = boardRef.current;
      const a = permRefs.current[selPerm];
      const t = oppSecRef.current;
      if (!b || !a || !t) {
        setArrow(null);
        return;
      }
      const br = b.getBoundingClientRect();
      const ar = a.getBoundingClientRect();
      const tr = t.getBoundingClientRect();
      setArrow({
        from: { x: ar.left + ar.width / 2 - br.left, y: ar.top - br.top },
        to: { x: tr.left + tr.width / 2 - br.left, y: tr.bottom - br.top },
      });
    };
    measure();
    const id = window.setTimeout(measure, 60);
    return () => window.clearTimeout(id);
  }, [selPerm, state]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.ox;
      const dy = e.clientY - d.oy;
      if (!d.started && Math.hypot(dx, dy) <= DRAG_THRESHOLD) {
        setDrag({ ...d, x: e.clientX, y: e.clientY });
        return;
      }
      if (!d.started) {
        // First movement past the threshold decides what the gesture is. A mostly
        // horizontal swipe belongs to the scroller the card sits in (the hand and
        // the battle rows pan sideways on touch), so we bow out and let the browser
        // take it; anything steeper is a drag to play or attack.
        if (d.deferred && Math.abs(dx) > Math.abs(dy)) {
          setDrag(null);
          return;
        }
        e.preventDefault();
        d.capture?.setPointerCapture?.(e.pointerId);
      }
      setDrag({ ...d, x: e.clientX, y: e.clientY, started: true });
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d) {
        if (d.started) handleDropRef.current?.(d, e.clientX, e.clientY);
        else handleTapRef.current?.(d);
      }
      setDrag(null);
    };
    const cancel = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const you = state?.players[viewerSeat];
  const opp = state?.players[otherSeat(viewerSeat)];

  // ----- pre-match / connection gates -----
  if (status === "reconnecting") {
    return (
      <BoardShell>
        <WaitingOverlay title={t("game.reconnecting")} detail={t("game.reconnectingDetail")} />
      </BoardShell>
    );
  }
  if (status === "error" || botError) {
    return (
      <BoardShell>
        <WaitingOverlay
          spinner={false}
          title={botError ? t("game.botConnectionFailed") : t("game.connectionLost")}
          detail={botError ?? error ?? t("game.connectionLostDetail")}
          actionLabel={t("game.returnToLobby")}
          onAction={() => onExit("lobby")}
        />
      </BoardShell>
    );
  }
  if (!state || !you || !opp || !bothSeated(state)) {
    const waitingTitle = vsBot
      ? t("game.waitingBot")
      : startMode === "private_host"
        ? t("game.waitingOpponent")
        : startMode === "private_guest"
          ? t("game.waitingJoinPrivate")
          : t("game.waitingFinding");
    const waitingDetail = vsBot
      ? t("game.waitingBotDetail")
      : startMode === "private_host"
        ? hostRoomCode
          ? t("game.shareCode", { code: hostRoomCode })
          : t("game.creatingRoom")
        : startMode === "private_guest"
          ? t("game.connectingPrivate")
          : t("game.queuedDetail", { name: joinOptions.displayName });
    return (
      <BoardShell>
        <WaitingOverlay title={waitingTitle} detail={waitingDetail} />
        {startMode === "private_host" && hostRoomCode ? (
          <div style={{ position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)", zIndex: 81 }}>
            <code
              onClick={() => navigator.clipboard?.writeText(hostRoomCode)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 32px",
                borderRadius: 14,
                background: "var(--ds-surface)",
                border: "1px solid var(--ds-border)",
                color: "var(--ds-foreground)",
                fontSize: 24,
                fontWeight: 800,
                fontFamily: "var(--ds-font-mono)",
                letterSpacing: "0.2em",
                cursor: "pointer",
              }}
              title={t("game.clickToCopy")}
            >
              {hostRoomCode}
            </code>
          </div>
        ) : null}
      </BoardShell>
    );
  }

  const isMyTurn = state.turnSeat === viewerSeat;
  const memory = displayMemory(state, viewerSeat);
  const instanceIndex = buildInstanceIndex(state, viewerSeat);
  const youColor = identityColor;
  const oppColor = playerColorKey(opp, youColor === "Red" ? "Blue" : "Red");

  const handEntries: HandEntry[] = you.hand.map((ci) => ({
    instanceId: ci.instanceId,
    cardId: ci.cardId,
    activatableEffectsJson: ci.activatableEffectsJson,
    playableFromHand: ci.playableFromHand,
    digivolveTargetPermanentIds: [...ci.digivolveTargetPermanentIds],
  }));
  const selEntry = handSel ? handEntries.find((h) => h.instanceId === handSel) : undefined;
  const selCardId = selEntry?.cardId;
  const selDef = selCardId ? getCardDefinition(selCardId) : undefined;
  const handPreviewEntry = handPreview ? handEntries.find((entry) => entry.instanceId === handPreview) : undefined;

  // ----- intent senders (no-op safely if the room dropped) -----
  const playCard = (instanceId: string, confirmDrop = false) => {
    const entry = handEntries.find((h) => h.instanceId === instanceId);
    if (entry) {
      const dnaMaterials = findDnaMaterialCombination(entry.cardId, you.battleArea);
      if (dnaMaterials) {
        if (actionConfirmationsEnabled) {
          setActionConfirm({ kind: "dna", instanceId, cardId: entry.cardId, materialPermanentIds: dnaMaterials });
        } else if (room) {
          playSound("confirm");
          intents.dnaDigivolve(room, dnaMaterials, instanceId);
          clearSel();
        }
        return;
      }
      const reqs = digiXrosRequirementFor(entry.cardId);
      if (reqs && reqs.length > 0) {
        const playingDefinition = getCardDefinition(entry.cardId);
        const candidates: DigiXrosCandidate[] = [
          ...you.hand
            .filter((ci) => ci.instanceId !== instanceId)
            .map((ci) => ({ instanceId: ci.instanceId, cardId: ci.cardId, zone: "hand" as const })),
          ...you.battleArea
            .filter((p) => p.topCard)
            .map((p) => ({
              instanceId: p.topCard!.instanceId,
              cardId: p.topCard!.cardId,
              zone: "battle" as const,
              digiXrosNames: [...p.digiXrosNames],
              canSubstitute: p.keywords.includes("DigiXrosSubstitute"),
            })),
        ];
        // `.flatMap()` isn't supported on Colyseus's `ArraySchema` proxy (it throws at
        // runtime — "ArraySchema#flatMap() is not supported"), unlike `.map()`/`.filter()`;
        // build with `.map().flat()` over a real array instead.
        const lockedCandidates: DigiXrosCandidate[] = [
          ...you.trash.map((ci) => ({ instanceId: ci.instanceId, cardId: ci.cardId, zone: "trash" as const })),
          ...you.battleArea
            .map((p) => {
              if (!p.topCard || !getCardDefinition(p.topCard.cardId)?.kinds.includes(CardKind.Tamer)) return [];
              return p.stack.map((ci) => ({
                instanceId: ci.instanceId,
                cardId: ci.cardId,
                zone: "underTamer" as const,
              }));
            })
            .flat(),
        ];
        const eligibleExpanders: DigiXrosEligibleExpander[] = playingDefinition
          ? you.battleArea
              .map((p) => {
                if (!p.topCard || p.isSuspended) return [];
                if (!getCardDefinition(p.topCard.cardId)?.kinds.includes(CardKind.Tamer)) return [];
                const expander = digiXrosZoneExpanderFor(p.topCard.cardId);
                if (!expander?.appliesTo(playingDefinition)) return [];
                return [
                  {
                    permanentId: p.permanentId,
                    cardId: p.topCard.cardId,
                    underTamerMax: expander.underTamerMax,
                    trashMax: expander.trashMax,
                  },
                ];
              })
              .flat()
          : [];
        setDigiXrosPick({
          instanceId,
          cardId: entry.cardId,
          requirements: reqs,
          candidates,
          lockedCandidates,
          eligibleExpanders,
        });
        return;
      }
      if (confirmDrop && actionConfirmationsEnabled) {
        setActionConfirm({ kind: "play", instanceId, cardId: entry.cardId });
        return;
      }
    }
    if (room) {
      playSound("confirm");
      intents.playCard(room, instanceId);
    }
    clearSel();
  };
  const digivolve = (permanentId: string, instanceId: string, useAlternateCost?: boolean) => {
    if (room) {
      playSound("confirm");
      intents.digivolve(room, permanentId, instanceId, useAlternateCost);
    }
    clearSel();
  };
  const attack = (attackerPermanentId: string, target: AttackTarget, vortex?: boolean) => {
    if (room) {
      playSound("attack");
      intents.attack(room, attackerPermanentId, target, vortex);
    }
    setSelPerm(null);
    setVortexMode(false);
  };
  const respondDecision = (response: DecisionResponse) => {
    if (decision && (room || demoConnection)) {
      playSound("confirm");
      if (room) intents.respondDecision(room, decision.decisionId, response);
      acknowledgeDecision?.(decision.decisionId);
    }
    setPicks([]);
  };
  const respondMulligan = (keep: boolean) => {
    if (room && decision?.kind === "mulligan") {
      playSound("confirm");
      intents.mulligan(room, keep);
      acknowledgeDecision(decision.decisionId);
    }
  };
  const activateEffect = (instanceId: string, effectKey: string) => {
    if (room) {
      playSound("confirm");
      intents.activateEffect(room, instanceId, effectKey);
    }
  };

  /** Check for multiple evo cost paths with different costs; show choice overlay only when costs differ. */
  const digivolveWithChoice = (
    permanentId: string,
    instanceId: string,
    cardId: string,
    base: Permanent,
    confirmDrop = false,
  ) => {
    const options = getDigivolveCostOptions(cardId, base, you, opp);
    const distinctCosts = new Set(options.map((o) => o.cost));
    if (options.length > 1 && distinctCosts.size > 1) {
      setEvoCostChoice({
        handInstanceId: instanceId,
        permanentId,
        handCardId: cardId,
        baseName: getCardDefinition(base.topCard?.cardId ?? "")?.nameEn ?? "?",
        options,
      });
      return;
    }
    if (confirmDrop && actionConfirmationsEnabled) {
      setActionConfirm({ kind: "digivolve", instanceId, cardId, permanentId, baseCardId: base.topCard?.cardId ?? "" });
      return;
    }
    digivolve(permanentId, instanceId);
  };

  // ----- derived block window (event-driven; shown only to the defender) -----
  const blockWindow = activeBlockWindow(events, isMyTurn);

  // §11-3 Counter Timing window: shown only to the defending (non-turn) seat.
  const counterWindow = activeCounterWindow(events, viewerSeat, isMyTurn);

  // Alliance/Evade/Barrier prompts: shown only to the seat that controls permanentId.
  // Scanning backwards from the log tail; dismissed by combatResolved or phaseChanged.
  const allianceWindow = (() => {
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const e = events[i]!;
      if (e.kind === "alliancePrompt") {
        const perm = findPermanentInState(state, e.permanentId);
        if (perm?.controllerSeat !== viewerSeat) return null;
        return { permanentId: e.permanentId, eligibleAllyIds: e.eligibleAllyIds };
      }
      if (
        e.kind === "allianceResolved" ||
        e.kind === "combatResolved" ||
        e.kind === "gameOver" ||
        e.kind === "phaseChanged"
      )
        return null;
    }
    return null;
  })();

  const evadeWindow = (() => {
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const e = events[i]!;
      if (e.kind === "evadePrompt") {
        const perm = findPermanentInState(state, e.permanentId);
        if (perm?.controllerSeat !== viewerSeat) return null;
        return { permanentId: e.permanentId };
      }
      if (
        e.kind === "evadeResolved" ||
        e.kind === "combatResolved" ||
        e.kind === "gameOver" ||
        e.kind === "phaseChanged"
      )
        return null;
    }
    return null;
  })();

  const barrierWindow = (() => {
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const e = events[i]!;
      if (e.kind === "barrierPrompt") {
        const perm = findPermanentInState(state, e.permanentId);
        if (perm?.controllerSeat !== viewerSeat) return null;
        return { permanentId: e.permanentId };
      }
      if (
        e.kind === "barrierResolved" ||
        e.kind === "combatResolved" ||
        e.kind === "gameOver" ||
        e.kind === "phaseChanged"
      )
        return null;
    }
    return null;
  })();

  // ----- eligibility helpers -----
  // Every "can I do this?" answer below is the server's, read off the state it already
  // projects (CardInstance.digivolveTargetPermanentIds / Permanent.attackablePermanentIds).
  // The client renders affordances; it does not re-derive the rules behind them.
  const handIsDigi = selDef?.kinds.includes(CardKind.Digimon) ?? false;
  const digivolveTargetsOf = (instanceId: string | undefined): readonly string[] =>
    (instanceId
      ? handEntries.find((entry) => entry.instanceId === instanceId)?.digivolveTargetPermanentIds
      : undefined) ?? [];
  const eligibleBase = (perm: Permanent): boolean =>
    digivolveTargetsOf(handSel ?? undefined).includes(perm.permanentId);
  const dragCardId = drag && drag.started ? drag.cardId : undefined;
  const dragIsPlay = drag?.kind === "play" && drag.started;
  const dragIsAttack = drag?.kind === "attack" && drag.started;

  // ----- drag plumbing -----
  const startHandDrag = (index: number, e: React.PointerEvent) => {
    const entry = handEntries[index];
    if (!entry) return;
    const deferred = e.pointerType !== "mouse";
    // Claiming the pointer up front (preventDefault + capture) kills the browser's
    // native pan, which is how the hand scrolls on touch. Defer both until `move`
    // has decided the gesture is a drag rather than a sideways swipe.
    if (!deferred) {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    setDrag({
      kind: "play",
      index,
      instanceId: entry.instanceId,
      cardId: entry.cardId,
      x: e.clientX,
      y: e.clientY,
      ox: e.clientX,
      oy: e.clientY,
      started: false,
      deferred,
      capture: e.currentTarget,
    });
  };
  const startPermDrag = (perm: Permanent, e: React.PointerEvent) => {
    if (perm.isSuspended) return;
    const def = perm.topCard ? getCardDefinition(perm.topCard.cardId) : undefined;
    if (!def?.kinds.includes(CardKind.Digimon)) return;
    const deferred = e.pointerType !== "mouse";
    if (!deferred) {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    setDrag({
      kind: "attack",
      permId: perm.permanentId,
      cardId: perm.topCard?.cardId ?? "",
      x: e.clientX,
      y: e.clientY,
      ox: e.clientX,
      oy: e.clientY,
      started: false,
      deferred,
      capture: e.currentTarget,
    });
  };

  const selectHandCard = (entry: HandEntry) => {
    setHandSel((selected) => {
      const next = selected === entry.instanceId ? null : entry.instanceId;
      if (next) playSound("select");
      return next;
    });
    if (narrowGameLayout) setHandPreview(entry.instanceId);
    setSelPerm(null);
  };

  const handleTap = (d: DragState) => {
    if (d.kind === "play") {
      const entry = handEntries.find((candidate) => candidate.instanceId === d.instanceId);
      if (entry) selectHandCard(entry);
    } else if (!handSel) {
      openOwnPermanent(d.permId);
    }
  };

  const handleDrop = (d: DragState, cx: number, cy: number) => {
    let zone: Element | null = null;
    let bestArea = Infinity;
    document.querySelectorAll("[data-drop]").forEach((z) => {
      const r = z.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
        const area = r.width * r.height;
        if (area < bestArea) {
          bestArea = area;
          zone = z;
        }
      }
    });
    if (!zone) return;
    const el = zone as Element;
    const target = el.getAttribute("data-drop");
    const id = el.getAttribute("data-id") ?? undefined;

    if (d.kind === "play") {
      const def = getCardDefinition(d.cardId);
      if (def?.kinds.includes(CardKind.DigiEgg)) {
        ping(t("game.hint.eggsHatch"));
        return;
      }
      if (target === "perm-you" && id) {
        const perm =
          you.battleArea.find((p) => p.permanentId === id) ??
          (you.breeding?.permanentId === id ? you.breeding : undefined);
        const evolutionRoute =
          perm && !perm.inBreeding
            ? handCardEvolutionRoute(
                d.cardId,
                you.battleArea,
                digivolveTargetsOf(d.instanceId).includes(perm.permanentId),
              )
            : undefined;
        if (perm && evolutionRoute?.kind === "normal")
          return digivolveWithChoice(perm.permanentId, d.instanceId, d.cardId, perm, true);
        if (evolutionRoute?.kind === "dna") return playCard(d.instanceId);
        if (perm && evolutionRoute?.kind === "both") {
          setActionConfirm({
            kind: "dna",
            instanceId: d.instanceId,
            cardId: d.cardId,
            materialPermanentIds: evolutionRoute.materialPermanentIds,
            normalPermanentId: perm.permanentId,
          });
          return;
        }
        if (!def?.kinds.includes(CardKind.Option)) return playCard(d.instanceId, true);
        ping(t("game.hint.dropOption"));
        return;
      }
      if (target === "breeding-you") {
        if (you.breeding && digivolveTargetsOf(d.instanceId).includes(you.breeding.permanentId)) {
          return digivolveWithChoice(you.breeding.permanentId, d.instanceId, d.cardId, you.breeding, true);
        }
        ping(t("game.hint.cantDigivolveHere"));
        return;
      }
      if (target === "battle-you") return playCard(d.instanceId, true);
      if (target === "opp-security" || target === "perm-opp") {
        ping(t("game.hint.cantPlayOnOpponent"));
        return;
      }
    }

    if (d.kind === "attack") {
      if (target === "opp-security") {
        const attacker = you.battleArea.find((x) => x.permanentId === d.permId);
        if (attacker?.canAttackPlayer) return attack(d.permId, { kind: "player" });
        ping(t("game.hint.onlySuspended"));
        return;
      }
      if (target === "perm-opp" && id) {
        const attacker = you.battleArea.find((x) => x.permanentId === d.permId);
        if (attacker?.attackablePermanentIds.includes(id)) {
          return attack(d.permId, { kind: "permanent", permanentId: id });
        }
        ping(t("game.hint.onlySuspended"));
        return;
      }
      ping(t("game.hint.dragTarget"));
    }
  };
  handleTapRef.current = handleTap;
  handleDropRef.current = handleDrop;

  // ----- field-card menu / stack viewer -----
  const findPermanent = (permanentId: string): Permanent | undefined => {
    for (const player of state.players) {
      const inBattle = player.battleArea.find((p) => p.permanentId === permanentId);
      if (inBattle) return inBattle;
      if (player.breeding?.permanentId === permanentId) return player.breeding;
    }
    return undefined;
  };

  /** Open the action menu anchored above a field card. */
  const showCardMenu = (permanentId: string, side: "you" | "opp") => {
    // Breeding-area permanents register no `permRefs` entry, so there is no anchor
    // rect for them. The bottom sheet ignores the anchor, so fall back to the
    // viewport centre rather than dropping the tap.
    const rect = permRefs.current[permanentId]?.getBoundingClientRect();
    hideOpponentInspector();
    setCardMenu({
      permanentId,
      side,
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top : window.innerHeight / 2,
    });
    setHandSel(null);
  };

  /** Begin attack-target selection with `permanentId` as the attacker; `vortex` declares a ＜Vortex＞ attack. */
  const beginAttack = (permanentId: string, vortex = false) => {
    playSound("select");
    setSelPerm(permanentId);
    setVortexMode(vortex);
    setHandSel(null);
    setCardMenu(null);
    setStackView(null);
    setOppInspector(null);
  };

  /** Flatten a permanent into its [active, digivolution…, linked…] cards for the modal. */
  const stackCardsOf = (perm: Permanent): StackCard[] => {
    const cards: StackCard[] = [];
    if (perm.topCard?.cardId) cards.push({ cardId: perm.topCard.cardId, role: "top" });
    for (const ci of perm.stack) cards.push({ cardId: ci.cardId, role: "stack" });
    for (const ci of perm.linked) cards.push({ cardId: ci.cardId, role: "linked" });
    return cards;
  };

  const showOpponentInspector = (permanentId: string, element: HTMLDivElement, immediate: boolean) => {
    if (inspectorTimerRef.current) window.clearTimeout(inspectorTimerRef.current);
    const open = () => {
      const rect = element.getBoundingClientRect();
      setOppInspector({ permanentId, x: rect.right, y: rect.top });
    };
    if (immediate) open();
    else inspectorTimerRef.current = window.setTimeout(open, 320);
  };

  const hideOpponentInspector = () => {
    if (inspectorTimerRef.current) window.clearTimeout(inspectorTimerRef.current);
    inspectorTimerRef.current = window.setTimeout(() => setOppInspector(null), 160);
  };

  function openOwnPermanent(permanentId: string) {
    if (!state) return;
    const perm = findPermanent(permanentId);
    if (!perm) return;
    const canPromote =
      perm.inBreeding &&
      canUseBreedingAction({
        phase: state.phase,
        isMyTurn,
        canHatch: false,
        canMove: canMoveFromBreeding(perm),
      });
    const destination = ownPermanentTapDestination({
      canAttack: canAttackWith(perm),
      canVortex: canVortexAttackWith(perm),
      canPromote,
    });
    if (destination === "menu") showCardMenu(perm.permanentId, "you");
    else setStackView(perm.permanentId);
  }

  const keepOpponentInspector = () => {
    if (inspectorTimerRef.current) window.clearTimeout(inspectorTimerRef.current);
  };

  // ----- click routing -----
  const onYourPerm = (perm: Permanent): (() => void) | undefined => {
    if (selCardId && handSel) {
      const route = handCardEvolutionRoute(selCardId, you.battleArea, eligibleBase(perm));
      if (route?.kind === "both")
        return () =>
          setActionConfirm({
            kind: "dna",
            instanceId: handSel,
            cardId: selCardId,
            materialPermanentIds: route.materialPermanentIds,
            normalPermanentId: perm.permanentId,
          });
      if (route?.kind === "dna") return () => playCard(handSel);
      if (route?.kind === "normal") return () => digivolveWithChoice(perm.permanentId, handSel, selCardId, perm);
    }
    if (handSel) return undefined;
    return () => openOwnPermanent(perm.permanentId);
  };
  const onOppPerm = (perm: Permanent): (() => void) | undefined => {
    const attacker = selPerm ? you.battleArea.find((candidate) => candidate.permanentId === selPerm) : undefined;
    if (attackTargetIdsOf(attacker, vortexMode).includes(perm.permanentId)) {
      return () => attack(selPerm!, { kind: "permanent", permanentId: perm.permanentId }, vortexMode);
    }
    return () => showCardMenu(perm.permanentId, "opp");
  };

  const onBreeding = () => {
    if (selCardId && you.breeding && eligibleBase(you.breeding))
      return digivolveWithChoice(you.breeding.permanentId, handSel!, selCardId!, you.breeding);
    if (you.breeding) {
      if (canMoveFromBreeding(you.breeding) && room) {
        playSound("confirm");
        intents.moveFromBreeding(room, you.breeding.permanentId);
        return;
      }
      ping(t("game.hint.needLevel3"));
      return;
    }
    if (room) {
      playSound("confirm");
      intents.hatchEgg(room);
    }
  };

  // ----- log + game over -----
  const log: LogLine[] = buildMatchLog(events, viewerSeat, instanceIndex, t);
  const gameOverReason = (() => {
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const e = events[i]!;
      if (e.kind === "gameOver") return e.reason;
    }
    return "security";
  })();
  const gameOverResult: "win" | "loss" | "draw" = (() => {
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const e = events[i]!;
      if (e.kind === "gameOver")
        return e.result.outcome === "draw" ? "draw" : e.result.winnerSeat === viewerSeat ? "win" : "loss";
    }
    if (state.winnerSeat === -1) return "draw";
    return state.winnerSeat === viewerSeat ? "win" : "loss";
  })();

  const attackerPerm = selPerm ? you.battleArea.find((p) => p.permanentId === selPerm) : undefined;
  const draggedAttackerPerm =
    drag?.kind === "attack" ? you.battleArea.find((p) => p.permanentId === drag.permId) : undefined;
  // The declaration the action bar is currently offering targets for. A ＜Vortex＞
  // declaration is scored under its own rules, so it reads its own projection.
  const attackTargets = attackTargetsOf(attackerPerm, opp.battleArea, vortexMode);
  const canAttackSecurity = canAttackPlayerWith(attackerPerm, vortexMode);

  // ----- overlays -----
  const stageEl = typeof document !== "undefined" ? document.getElementById("aegis-stage") : null;
  const overlays = (
    <>
      {decision && decision.seat === viewerSeat && decision.kind === "mulligan" ? (
        <MulliganOverlay
          handCardIds={handEntries.map((h) => h.cardId)}
          onKeep={() => respondMulligan(true)}
          onMulligan={() => respondMulligan(false)}
        />
      ) : null}

      {handPreviewEntry ? (
        <HandCardPreview
          cardId={handPreviewEntry.cardId}
          activatableEffects={parseActivatable(handPreviewEntry.activatableEffectsJson)}
          canPlay={handPreviewEntry.playableFromHand}
          canDigivolve={handPreviewEntry.digivolveTargetPermanentIds.length > 0}
          onPlay={() => {
            if (handSel) playCard(handSel);
            setHandPreview(null);
          }}
          onActivateEffect={(effect) => {
            activateEffect(effect.instanceId, effect.effectKey);
            setHandPreview(null);
            clearSel();
          }}
          onChooseBase={() => setHandPreview(null)}
          onCancel={() => {
            setHandPreview(null);
            clearSel();
          }}
        />
      ) : null}

      {decision &&
      decision.seat === viewerSeat &&
      (decision.kind === "optional" ||
        decision.kind === "chooseTargets" ||
        decision.kind === "selectCards" ||
        decision.kind === "orderCards" ||
        decision.kind === "chooseOption" ||
        decision.kind === "orderTriggers")
        ? (() => {
            const selectable = new Set(decision.options?.candidateInstanceIds ?? []);
            const visibleCards = decisionVisibleCards(decision.options, instanceIndex);
            const visible = visibleCards.map((card) => card.instanceId);
            const visibleCardIds = new Map(visibleCards.map((card) => [card.instanceId, card.cardId]));
            const sourceCounts = decisionSourceCounts([...you.battleArea, ...opp.battleArea]);
            const permanentDetails = decisionPermanentDetails([...you.battleArea, ...opp.battleArea]);
            const opts = decision.options;
            const diffColors = opts?.differentColors === true;
            const distinctCardIds = opts?.distinctCardIds === true;
            const instanceColors = decisionCardColors(visibleCards);
            // CR 4-24-2: a multicolor card only needs one color no other pick uses, so the
            // picks stay legal as long as a distinct color can still be assigned to each.
            const distinctColorsAllow = (iid: string) =>
              differentColorsAllowCandidate(iid, picks, instanceColors, diffColors);
            return (
              <DecisionOverlay
                key={decision.decisionId}
                request={decision}
                sourceCardId={decisionEffectSource(decision, events)}
                candidates={visible.map((iid) => {
                  const details = permanentDetails.get(iid);
                  return {
                    instanceId: iid,
                    cardId: visibleCardIds.get(iid),
                    selectable:
                      selectable.has(iid) &&
                      distinctColorsAllow(iid) &&
                      distinctCardIdsAllow(iid, picks, visibleCardIds, distinctCardIds),
                    sourceCount: sourceCounts.get(iid),
                    currentDP: details?.currentDP,
                    isSuspended: details?.isSuspended,
                  };
                })}
                picks={picks}
                onTogglePick={(iid) => {
                  if (!selectable.has(iid)) return;
                  if (!distinctColorsAllow(iid)) return;
                  if (!distinctCardIdsAllow(iid, picks, visibleCardIds, distinctCardIds)) return;
                  setPicks((p) => {
                    if (p.includes(iid)) return p.filter((x) => x !== iid);
                    const max = decision.options?.max ?? 1;
                    const keep = max > 1 ? p.slice(-(max - 1)) : [];
                    return [...keep, iid];
                  });
                }}
                onRespond={respondDecision}
              />
            );
          })()
        : null}

      {state.phase === Phase.Breeding && isMyTurn && !decision && !secReveal
        ? (() => {
            const canHatch = you.eggDeckCount > 0 && !you.breeding;
            const canMove = canMoveFromBreeding(you.breeding);
            if (!canHatch && !canMove) return null;
            return (
              <BreedingOverlay
                canHatch={canHatch}
                canMove={canMove}
                onHatch={() => room && intents.hatchEgg(room)}
                onMove={() => room && you.breeding && intents.moveFromBreeding(room, you.breeding.permanentId)}
                onSkip={() => room && intents.endPhase(room)}
              />
            );
          })()
        : null}

      {blockWindow ? (
        <BlockOverlay
          attackerCardId={permCardId(state, blockWindow.attackerPermanentId)}
          blockers={blockWindow.eligibleBlockerIds.map((pid) => ({
            permanentId: pid,
            cardId: permCardId(state, pid) ?? "",
            currentDP: findPermanentInState(state, pid)?.currentDP ?? 0,
            sourceCount: findPermanentInState(state, pid)?.stack.length ?? 0,
          }))}
          onBlock={(pid) => (room ? intents.declareBlock(room, pid) : demoConnection?.acknowledgeBlockWindow?.(pid))}
          onDecline={() => (room ? intents.declineBlock(room) : demoConnection?.acknowledgeBlockWindow?.())}
        />
      ) : null}

      {counterWindow ? (
        <CounterOverlay
          attackerCardId={permCardId(state, counterWindow.attackerPermanentId)}
          eligibleCounters={counterWindow.eligibleCounters}
          getCardId={(instanceId) => instanceCardId(state, instanceId)}
          onActivate={(instanceId, effectKey) => room && intents.respondCounter(room, instanceId, effectKey)}
          onPass={() => room && intents.respondCounter(room)}
        />
      ) : null}

      {allianceWindow ? (
        <AllianceOverlay
          triggerCardId={permCardId(state, allianceWindow.permanentId)}
          allies={allianceWindow.eligibleAllyIds.map((pid) => {
            const permanent = findPermanentInState(state, pid);
            return {
              permanentId: pid,
              cardId: permanent?.topCard?.cardId ?? "",
              currentDP: permanent?.currentDP ?? 0,
              sourceCount: permanent?.stack.length ?? 0,
            };
          })}
          onChoose={(allyPid) => room && intents.respondAlliance(room, allyPid)}
          onPass={() => room && intents.respondAlliance(room)}
        />
      ) : null}

      {evadeWindow ? (
        <EvadeOverlay
          permanentId={evadeWindow.permanentId}
          getCardId={(pid) => permCardId(state, pid)}
          onAccept={() => room && intents.respondEvade(room, evadeWindow.permanentId, true)}
          onDecline={() => room && intents.respondEvade(room, evadeWindow.permanentId, false)}
        />
      ) : null}

      {barrierWindow ? (
        <BarrierOverlay
          permanentId={barrierWindow.permanentId}
          getCardId={(pid) => permCardId(state, pid)}
          onAccept={() => room && intents.respondBarrier(room, barrierWindow.permanentId, true)}
          onDecline={() => room && intents.respondBarrier(room, barrierWindow.permanentId, false)}
        />
      ) : null}

      {secReveal && !state.gameOver ? (
        <SecurityOverlay
          cardId={secReveal.cardId}
          resolution={secReveal.resolution}
          onContinue={() => {
            if (securityToastTimerRef.current) window.clearTimeout(securityToastTimerRef.current);
            setSecReveal(null);
          }}
        />
      ) : null}

      {recoveryToast && !state.gameOver ? (
        <RecoveryToast
          key={recoveryToast.key}
          amount={recoveryToast.amount}
          mine={recoveryToast.seat === viewerSeat}
          anchor={recoveryToast.seat === viewerSeat ? yourSecRef.current : oppSecRef.current}
        />
      ) : null}

      {effectNotice && !decision && !state.gameOver ? (
        <EffectClauseToast
          key={effectNotice.key}
          cardId={effectNotice.cardId}
          timing={effectNotice.timing}
          description={effectNotice.description}
        />
      ) : null}

      {historyOpen ? <MatchHistorySheet log={log} onClose={() => setHistoryOpen(false)} /> : null}

      {state.gameOver ? (
        <GameOverOverlay
          result={gameOverResult}
          reason={gameOverReason}
          stats={[
            { value: state.turnCount, label: t("game.stats.turns") },
            { value: opp.battleArea.length, label: t("game.stats.oppBoard") },
            { value: you.securityCount, label: t("game.stats.yourSecurity") },
          ]}
          onMenu={() => onExit("home")}
          onRematch={() => onExit("lobby")}
        />
      ) : null}

      {actionConfirm ? (
        <ActionConfirmationOverlay
          cardId={actionConfirm.cardId}
          title={actionConfirm.kind === "dna" ? t("overlay.confirmDnaTitle") : t("overlay.confirmActionTitle")}
          detail={
            actionConfirm.kind === "play"
              ? t("overlay.confirmPlayDetail", {
                  card: getCardDefinition(actionConfirm.cardId)?.nameEn ?? actionConfirm.cardId,
                })
              : actionConfirm.kind === "digivolve"
                ? t("overlay.confirmDigivolveDetail", {
                    card: getCardDefinition(actionConfirm.cardId)?.nameEn ?? actionConfirm.cardId,
                    base: getCardDefinition(actionConfirm.baseCardId)?.nameEn ?? actionConfirm.baseCardId,
                  })
                : t("overlay.confirmDnaDetail", {
                    card: getCardDefinition(actionConfirm.cardId)?.nameEn ?? actionConfirm.cardId,
                    count: actionConfirm.materialPermanentIds.length,
                  })
          }
          confirmLabel={
            actionConfirm.kind === "play"
              ? t("overlay.confirmPlay")
              : actionConfirm.kind === "dna"
                ? t("overlay.confirmDna")
                : t("overlay.confirmDigivolve")
          }
          alternateLabel={
            actionConfirm.kind === "dna" && actionConfirm.normalPermanentId ? t("overlay.digivolveNormally") : undefined
          }
          onConfirm={() => {
            if (room) {
              if (actionConfirm.kind === "play") intents.playCard(room, actionConfirm.instanceId);
              else if (actionConfirm.kind === "digivolve")
                intents.digivolve(room, actionConfirm.permanentId, actionConfirm.instanceId);
              else intents.dnaDigivolve(room, actionConfirm.materialPermanentIds, actionConfirm.instanceId);
            }
            playSound("confirm");
            setActionConfirm(null);
            clearSel();
          }}
          onAlternate={
            actionConfirm.kind === "dna" && actionConfirm.normalPermanentId
              ? () => {
                  const pending = actionConfirm;
                  const base = findPermanent(pending.normalPermanentId!);
                  setActionConfirm(null);
                  if (base) digivolveWithChoice(pending.normalPermanentId!, pending.instanceId, pending.cardId, base);
                }
              : undefined
          }
          onCancel={() => {
            setActionConfirm(null);
            clearSel();
          }}
        />
      ) : null}

      {evoCostChoice ? (
        <EvoCostChoiceOverlay
          evolvingCardId={evoCostChoice.handCardId}
          baseName={evoCostChoice.baseName}
          options={evoCostChoice.options}
          onConfirm={(useAlternate) => {
            if (room) intents.digivolve(room, evoCostChoice.permanentId, evoCostChoice.handInstanceId, useAlternate);
            setEvoCostChoice(null);
            clearSel();
          }}
          onCancel={() => {
            setEvoCostChoice(null);
            clearSel();
          }}
        />
      ) : null}

      {digiXrosPick ? (
        <DigiXrosMaterialOverlay
          playingCardId={digiXrosPick.cardId}
          requirements={digiXrosPick.requirements}
          candidates={digiXrosPick.candidates}
          lockedCandidates={digiXrosPick.lockedCandidates}
          eligibleExpanders={digiXrosPick.eligibleExpanders}
          onConfirm={(materialInstanceIds, expanderPermanentIds) => {
            if (room)
              intents.playCard(room, digiXrosPick.instanceId, undefined, { materialInstanceIds, expanderPermanentIds });
            setDigiXrosPick(null);
            clearSel();
          }}
          onSkip={() => {
            if (room) intents.playCard(room, digiXrosPick.instanceId);
            setDigiXrosPick(null);
            clearSel();
          }}
          onCancel={() => {
            setDigiXrosPick(null);
            clearSel();
          }}
        />
      ) : null}

      {cardMenu && !decision
        ? (() => {
            const perm = findPermanent(cardMenu.permanentId);
            if (!perm) return null;
            const mine = cardMenu.side === "you";
            return (
              <CardActionMenu
                x={cardMenu.x}
                y={cardMenu.y}
                cardId={perm.topCard?.cardId}
                sheet={narrowGameLayout}
                dp={perm.currentDP}
                baseDP={perm.baseDP}
                keywords={[...perm.keywords]}
                stackCards={stackCardsOf(perm)}
                suspended={perm.isSuspended}
                promote={
                  // Same gate as the action bar: a breeding Digimon only moves out at
                  // level 3, so below that the action would just refuse.
                  cardMenu.side === "you" &&
                  perm.inBreeding &&
                  canUseBreedingAction({
                    phase: state.phase,
                    isMyTurn,
                    canHatch: false,
                    canMove: canMoveFromBreeding(perm),
                  })
                    ? {
                        label: t("game.moveToBattle"),
                        onPromote: () => {
                          setCardMenu(null);
                          onBreeding();
                        },
                      }
                    : undefined
                }
                canAttack={mine && canAttackWith(perm)}
                canVortex={mine && canVortexAttackWith(perm)}
                onViewStack={() => {
                  setStackView(cardMenu.permanentId);
                  setCardMenu(null);
                }}
                onAttack={() => beginAttack(cardMenu.permanentId)}
                onVortex={() => beginAttack(cardMenu.permanentId, true)}
                onClose={() => setCardMenu(null)}
              />
            );
          })()
        : null}

      {stackView
        ? (() => {
            const perm = findPermanent(stackView);
            if (!perm) return null;
            const mine = perm.controllerSeat === viewerSeat;
            return (
              <StackViewerOverlay
                title={getCardDefinition(perm.topCard?.cardId ?? "")?.nameEn ?? t("game.stack")}
                cards={stackCardsOf(perm)}
                canAttack={mine && canAttackWith(perm)}
                canVortex={mine && canVortexAttackWith(perm)}
                onAttack={() => beginAttack(perm.permanentId)}
                onVortex={() => beginAttack(perm.permanentId, true)}
                onClose={() => setStackView(null)}
              />
            );
          })()
        : null}

      {oppInspector && !decision && !stackView && !selPerm && !dragIsAttack
        ? (() => {
            const perm = findPermanent(oppInspector.permanentId);
            if (!perm) return null;
            return (
              <OpponentPermanentInspector
                title={getCardDefinition(perm.topCard?.cardId ?? "")?.nameEn ?? t("game.stack")}
                cards={stackCardsOf(perm)}
                x={oppInspector.x}
                y={oppInspector.y}
                onInteractStart={keepOpponentInspector}
                onInteractEnd={hideOpponentInspector}
              />
            );
          })()
        : null}

      {trashView
        ? (() => {
            const owner = trashView === "you" ? you : opp;
            const ownerLabel =
              trashView === "you"
                ? t("game.yourTrash")
                : t("game.oppTrash", { name: opp.displayName || t("game.opponent") });
            return (
              <TrashViewerOverlay
                title={ownerLabel}
                cardIds={owner.trash.map((c) => c.cardId)}
                sheet={narrowGameLayout}
                onClose={() => setTrashView(null)}
              />
            );
          })()
        : null}
    </>
  );

  return (
    <main
      className="game-layout"
      style={{ height: "100%", display: "flex", background: "var(--ds-background)", overflow: "hidden" }}
    >
      <div
        className="game-board"
        ref={boardRef}
        style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", ...battlefield }}
      >
        {/* opponent identity bar */}
        <header
          className="game-opponent-bar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 26px",
            borderBottom: "1px solid var(--ds-border)",
            background: "var(--ds-surface)",
          }}
        >
          <div className="game-opponent-identity" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={opp.displayName || t("game.opponent")} color={oppColor} size={40} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--ds-foreground)" }}>
                {opp.displayName || t("game.opponent")}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--ds-foreground-muted)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: opp.connected ? "var(--ds-success)" : "var(--ds-danger)",
                  }}
                />
                {opp.connected ? t("game.connected") : t("game.disconnected")} ·{" "}
                {state.turnSeat === otherSeat(viewerSeat) ? t("game.theirTurn") : t("game.waiting")}
              </div>
            </div>
          </div>
          <div className="game-opponent-hand" style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {Array.from({ length: Math.min(opp.handCount, 8) }).map((_, i) => (
              <div key={i} aria-hidden style={{ marginLeft: i ? -22 : 0 }}>
                <div
                  style={{
                    width: 30,
                    height: 42,
                    borderRadius: 5,
                    background: "linear-gradient(150deg, var(--ds-surface-muted), var(--ds-surface))",
                    border: "1px solid var(--ds-border-strong)",
                  }}
                />
              </div>
            ))}
            <span
              style={{
                fontFamily: "var(--ds-font-mono)",
                fontSize: 12,
                color: "var(--ds-foreground-muted)",
                marginLeft: 8,
              }}
            >
              {t("game.handCount", { count: opp.handCount })}
            </span>
          </div>
          <div className="game-mobile-turn">
            <strong>
              {state.turnSeat === viewerSeat ? t("game.yourTurn") : t("game.opponentsTurn")} · {state.turnCount}
            </strong>
            <span>
              {t(`game.phase.${state.phase}` as const)} · {memory > 0 ? "+" : ""}
              {memory}
            </span>
          </div>
          {narrowGameLayout ? (
            <button className="game-mobile-surrender" onClick={() => room && intents.surrender(room)}>
              {t("game.surrender")}
            </button>
          ) : null}
        </header>

        {!feedPaused && !state.gameOver ? (
          <OpponentActionFeed
            current={opponentFeed.current}
            trail={opponentFeed.trail}
            pendingCount={opponentFeed.pending.length}
            onOpenHistory={narrowGameLayout ? () => setHistoryOpen(true) : undefined}
          />
        ) : null}

        {flash ? (
          <div
            style={{
              position: "absolute",
              top: 64,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 70,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 16px",
              borderRadius: 999,
              background: "var(--ds-danger-light)",
              color: "var(--ds-danger)",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "var(--ds-shadow-md)",
            }}
          >
            <Icons.CircleAlert size={15} />
            {flash}
          </div>
        ) : null}

        {turnTransition ? (
          <div
            style={{
              position: "absolute",
              top: 60,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 71,
              padding: "10px 28px",
              borderRadius: 12,
              background:
                turnTransition.endingSeat === viewerSeat ? "var(--ds-warning-light)" : "var(--ds-primary-light)",
              color: turnTransition.endingSeat === viewerSeat ? "var(--ds-warning)" : "var(--ds-primary)",
              fontSize: 15,
              fontWeight: 700,
              boxShadow: "var(--ds-shadow-lg)",
              animation: "aegis-fadeIn 0.3s ease-out",
              letterSpacing: "0.02em",
            }}
          >
            {turnTransition.endingSeat === viewerSeat ? t("game.yourTurnEnded") : t("game.opponentsTurn")}
          </div>
        ) : null}

        {/* field: left column / center / right column */}
        <div className="game-field" style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", overflow: "hidden" }}>
          {/* left column: opp deck+trash (top) | your security (bottom) */}
          <aside
            className="game-pile-column game-pile-column--left"
            style={{
              width: 130,
              flexShrink: 0,
              borderRight: "1px solid var(--ds-border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "14px 10px",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <Pile
                compact={compactPiles}
                count={opp.deckCount}
                label={t("game.pile.deck")}
                useSelectedSleeve={false}
              />
              <Pile
                compact={compactPiles}
                count={opp.trash.length}
                label={t("game.pile.trash")}
                topCardId={opp.trash[opp.trash.length - 1]?.cardId}
                onClick={opp.trash.length ? () => setTrashView("opp") : undefined}
                useSelectedSleeve={false}
              />
            </div>
            <div style={{ flex: 1 }} />
            <Pile
              className="game-security-pile"
              compact={compactPiles}
              count={you.securityCount}
              label={t("game.pile.security")}
              refEl={(el) => {
                yourSecRef.current = el;
              }}
            />
          </aside>

          {/* center: opp battle | memory gauge | your battle */}
          <section
            className="game-battle-zones"
            style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
          >
            <div
              className="game-battle-row"
              role="group"
              aria-label={t("game.oppBattleArea")}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                gap: 18,
                justifyContent: "safe center",
                alignItems: "center",
                minHeight: 110,
                // Bottom room for the activate-effect pill, which hangs below its
                // permanent inside a row that clips vertical overflow.
                padding: "12px 18px 26px",
              }}
            >
              {opp.battleArea.length === 0 ? (
                <span
                  style={{ fontSize: 12, color: "var(--ds-foreground-disabled)", fontFamily: "var(--ds-font-mono)" }}
                >
                  {t("game.noDigimon")}
                </span>
              ) : null}
              {opp.battleArea.map((p) => {
                // A drag is always a normal declaration; only the tap path can be in ＜Vortex＞ mode.
                const isCand =
                  attackTargetIdsOf(attackerPerm, vortexMode).includes(p.permanentId) ||
                  attackTargetIdsOf(draggedAttackerPerm, false).includes(p.permanentId);
                return (
                  <PermanentView
                    key={p.permanentId}
                    perm={p}
                    compact={narrowGameLayout || shortBoard}
                    refCb={(el) => {
                      permRefs.current[p.permanentId] = el;
                    }}
                    drop={{ "data-drop": "perm-opp", "data-id": p.permanentId }}
                    candidate={isCand}
                    onClick={onOppPerm(p)}
                    onInspectStart={
                      !selPerm && !dragIsAttack
                        ? (element, immediate) => showOpponentInspector(p.permanentId, element, immediate)
                        : undefined
                    }
                    onInspectEnd={!selPerm && !dragIsAttack ? hideOpponentInspector : undefined}
                  />
                );
              })}
            </div>
            <div style={{ padding: "2px 0", flexShrink: 0 }}>
              <MemoryGauge value={memory} yourColor={youColor} oppColor={oppColor} compact={compactPiles} />
            </div>
            <div
              data-drop="battle-you"
              className="game-battle-row"
              role="group"
              aria-label={t("game.yourBattleArea")}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                gap: 18,
                justifyContent: "safe center",
                alignItems: "center",
                minHeight: 110,
                // Bottom room for the activate-effect pill, which hangs below its
                // permanent inside a row that clips vertical overflow.
                padding: "12px 18px 26px",
                borderRadius: 14,
                transition: "background 150ms, box-shadow 150ms",
                background: dragIsPlay ? "var(--ds-primary-light)" : "transparent",
                boxShadow: dragIsPlay ? "inset 0 0 0 2px var(--ds-primary)" : "none",
              }}
            >
              {you.battleArea.length === 0 ? (
                <span
                  style={{
                    fontSize: 12,
                    color: dragIsPlay ? "var(--ds-primary)" : "var(--ds-foreground-disabled)",
                    fontFamily: "var(--ds-font-mono)",
                  }}
                >
                  {dragIsPlay ? t("game.dropToPlay") : t("game.noDigimon")}
                </span>
              ) : null}
              {you.battleArea.map((p) => {
                const isBase =
                  (handIsDigi && eligibleBase(p)) ||
                  (dragIsPlay && digivolveTargetsOf(drag?.instanceId).includes(p.permanentId));
                const draggable = canAttackWith(p);
                return (
                  <PermanentView
                    key={p.permanentId}
                    perm={p}
                    compact={narrowGameLayout || shortBoard}
                    refCb={(el) => {
                      permRefs.current[p.permanentId] = el;
                    }}
                    candidate={isBase}
                    highlight={selPerm === p.permanentId}
                    drop={{ "data-drop": "perm-you", "data-id": p.permanentId }}
                    onClick={draggable ? undefined : onYourPerm(p)}
                    onPointerDown={draggable ? (e) => startPermDrag(p, e) : undefined}
                    // Drag-only permanents still need a pointer-free path: Enter or
                    // Space selects them like a tap would.
                    onKeyboardActivate={draggable ? onYourPerm(p) : undefined}
                    onActivateEffect={isMyTurn ? activateEffect : undefined}
                  />
                );
              })}
            </div>
          </section>

          {/* right column: opp breeding+security (top) | your deck+trash (bottom) */}
          <aside
            className="game-pile-column game-pile-column--right"
            style={{
              width: 130,
              flexShrink: 0,
              borderLeft: "1px solid var(--ds-border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "14px 10px",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              {/* In the narrow rail the slot matches the pile width, so the card it
                holds cannot overflow the rail and get clipped. */}
              <BreedingSlot
                perm={opp.breeding}
                label={t("game.pile.raising")}
                compact={compactPiles}
                width={compactPiles ? 42 : narrowRail ? NARROW_RAIL_SLOT_WIDTH : undefined}
                onClick={
                  narrowGameLayout && opp.breeding ? () => showCardMenu(opp.breeding!.permanentId, "opp") : undefined
                }
              />
              <Pile
                className="game-security-pile"
                compact={compactPiles}
                count={opp.securityCount}
                label={t("game.pile.security")}
                useSelectedSleeve={false}
                refEl={(el) => {
                  oppSecRef.current = el;
                }}
                drop={{ "data-drop": "opp-security" }}
                glow={canAttackSecurity || canAttackPlayerWith(draggedAttackerPerm, false)}
                onClick={
                  selPerm && canAttackSecurity ? () => attack(selPerm, { kind: "player" }, vortexMode) : undefined
                }
              />
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <Pile compact={compactPiles} count={you.deckCount} label={t("game.pile.deck")} />
              <Pile
                compact={compactPiles}
                count={you.trash.length}
                label={t("game.pile.trash")}
                topCardId={you.trash[you.trash.length - 1]?.cardId}
                onClick={you.trash.length ? () => setTrashView("you") : undefined}
              />
            </div>
          </aside>
        </div>

        {/* bottom strip: breeding area (left) + action bar + hand (right) */}
        <footer
          className="game-player-dock"
          style={{
            flexShrink: 0,
            borderTop: "1px solid var(--ds-border)",
            background: "var(--ds-surface)",
            display: "flex",
            alignItems: "stretch",
          }}
        >
          {/* breeding area (bottom-left) */}
          <div
            className="game-breeding-dock"
            style={{
              width: 228,
              flexShrink: 0,
              borderRight: "1px solid var(--ds-border)",
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--ds-foreground-muted)",
              }}
            >
              {t("game.breedingArea")}
            </div>
            <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
              <Pile compact={compactPiles} count={you.eggDeckCount} label={t("game.pile.eggs")} />
              <BreedingSlot
                perm={you.breeding}
                label={t("game.pile.raising")}
                compact={compactPiles}
                // On a phone the dock is a row above the hand; a smaller slot gives
                // its height back to the battle rows while staying a 44px+ target.
                width={narrowGameLayout ? 46 : undefined}
                candidate={
                  !!you.breeding &&
                  (eligibleBase(you.breeding) ||
                    (dragIsPlay && digivolveTargetsOf(drag?.instanceId).includes(you.breeding.permanentId)))
                }
                drop={{ "data-drop": "breeding-you" }}
                onClick={you.breeding ? onYourPerm(you.breeding) : onBreeding}
              />
            </div>
          </div>

          {/* action bar + hand */}
          <div className="game-hand-dock" style={{ flex: 1, minWidth: 0, padding: "8px 20px 12px" }}>
            <ActionBar
              youName={you.displayName || joinOptions.displayName}
              youColor={youColor}
              avatarId={identityAvatarId}
              avatarUrl={identityAvatarUrl}
              handCount={you.handCount}
              selCardId={handPreview ? undefined : selCardId}
              attackerCardId={attackerPerm?.topCard?.cardId}
              attackTargets={attackTargets}
              canAttackSecurity={canAttackSecurity}
              vortexMode={vortexMode}
              canPlay={selEntry?.playableFromHand === true}
              hasBase={(selEntry?.digivolveTargetPermanentIds.length ?? 0) > 0}
              onPlay={() => handSel && playCard(handSel)}
              onAttackSec={() => selPerm && attack(selPerm, { kind: "player" }, vortexMode)}
              onAttackPerm={(pid) => selPerm && attack(selPerm, { kind: "permanent", permanentId: pid }, vortexMode)}
              onCancel={clearSel}
            />
            <Hand
              cardWidth={compactPiles ? HAND_CARD_WIDTH_COMPACT : HAND_CARD_WIDTH}
              cards={handEntries}
              selectedInstanceId={handSel ?? undefined}
              startDrag={startHandDrag}
              selectCard={(index) => {
                const entry = handEntries[index];
                if (entry) selectHandCard(entry);
              }}
              draggingInstanceId={dragIsPlay && drag?.kind === "play" ? drag.instanceId : undefined}
            />
          </div>
        </footer>

        {arrow ? <AttackArrow from={arrow.from} to={arrow.to} /> : null}
      </div>

      <Sidebar
        phase={state.phase}
        turnCount={state.turnCount}
        memory={memory}
        isMyTurn={isMyTurn}
        canMove={canMoveFromBreeding(you.breeding)}
        hasBreeding={!!you.breeding}
        canHatch={you.eggDeckCount > 0 && !you.breeding}
        narrow={narrowGameLayout}
        log={log}
        onHatchOrMove={onBreeding}
        onEndPhase={() => room && intents.endPhase(room)}
        onSurrender={() => room && intents.surrender(room)}
      />

      {stageEl ? createPortal(overlays, stageEl) : overlays}

      {dragCardId
        ? createPortal(
            <div
              style={{
                position: "fixed",
                left: drag!.x,
                top: drag!.y,
                transform: "translate(-50%, -52%) rotate(-4deg)",
                pointerEvents: "none",
                zIndex: 9999,
                opacity: 0.95,
                filter: "drop-shadow(0 18px 30px rgba(15,23,42,0.4))",
              }}
            >
              <CardFull cardId={dragCardId} width={124} />
            </div>,
            document.body,
          )
        : null}
    </main>
  );
}

/** The frame the board renders into while waiting/connecting (so overlays have a stage). */
function BoardShell({ children }: { children: React.ReactNode }) {
  const surface = useBattlefieldStyle();
  return <div style={{ height: "100%", position: "relative", ...surface }}>{children}</div>;
}

export function HandCardPreview({
  cardId,
  activatableEffects,
  canPlay,
  canDigivolve,
  onPlay,
  onActivateEffect,
  onChooseBase,
  onCancel,
}: {
  cardId: string;
  activatableEffects: ActivatableEntry[];
  canPlay: boolean;
  canDigivolve: boolean;
  onPlay: () => void;
  onActivateEffect: (effect: ActivatableEntry) => void;
  onChooseBase: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const card = getCardDefinition(cardId);
  const [zoomed, setZoomed] = useState(false);
  return createPortal(
    // Same bottom sheet as the field-card actions, so tapping a card reads the same
    // whether it is in hand or on the board.
    <div
      className="card-action-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={card?.nameEn ?? cardId}
      onClick={onCancel}
    >
      <div className="card-action-sheet__panel" onClick={(event) => event.stopPropagation()}>
        <div className="card-action-sheet__grip" aria-hidden />
        <div className="card-action-sheet__body">
          <button
            type="button"
            className="card-action-sheet__zoom"
            onClick={() => setZoomed(true)}
            aria-label={t("overlay.zoomCard")}
          >
            <CardFull cardId={cardId} width={190} />
          </button>
          <div className="card-action-sheet__info">
            <strong>{card?.nameEn ?? cardId}</strong>
            <div className="card-action-sheet__stats">
              {card?.level ? <span>Lv.{card.level}</span> : null}
              <span>
                {card && card.playCost >= 0 ? t("game.costsMemory", { count: card.playCost }) : t("game.noCost")}
              </span>
              {card?.dp ? <span>{card.dp.toLocaleString()} DP</span> : null}
            </div>
          </div>
        </div>
        <div className="card-action-sheet__actions" aria-label={t("game.actions")}>
          {activatableEffects.map((effect, index) => (
            <Button
              key={`${effect.instanceId}:${effect.effectKey}`}
              size="md"
              full
              variant="secondary"
              icon={Icons.Sparkles}
              onClick={() => onActivateEffect(effect)}
              autoFocus={index === 0}
            >
              {t("game.activateEffect")}
              {activatableEffects.length > 1 ? ` ${index + 1}` : ""}
            </Button>
          ))}
          {canPlay ? (
            <Button size="md" full icon={Icons.Sparkles} onClick={onPlay} autoFocus={activatableEffects.length === 0}>
              {playButtonLabel(card?.kinds ?? [], t)}
            </Button>
          ) : null}
          {canDigivolve ? (
            <Button
              size="md"
              full
              variant="secondary"
              icon={Icons.ChevronUp}
              onClick={onChooseBase}
              autoFocus={activatableEffects.length === 0 && !canPlay}
            >
              {t("game.clickToDigivolve")}
            </Button>
          ) : null}
          <Button
            size="sm"
            full
            variant="ghost"
            onClick={onCancel}
            autoFocus={activatableEffects.length === 0 && !canPlay && !canDigivolve}
          >
            {t("common.cancel")}
          </Button>
        </div>
        {zoomed ? <CardZoomOverlay cardId={cardId} onClose={() => setZoomed(false)} /> : null}
      </div>
    </div>,
    document.body,
  );
}

function ActionBar({
  youName,
  youColor,
  avatarId,
  avatarUrl,
  handCount,
  selCardId,
  attackerCardId,
  attackTargets,
  canAttackSecurity,
  vortexMode,
  canPlay,
  hasBase,
  onPlay,
  onAttackSec,
  onAttackPerm,
  onCancel,
}: {
  youName: string;
  youColor: ColorName;
  avatarId?: DigimonWorldAvatarId | null;
  avatarUrl?: string | null;
  handCount: number;
  selCardId?: string;
  attackerCardId?: string;
  /** Server-projected legal Digimon targets for the declaration being built. */
  attackTargets: Permanent[];
  canAttackSecurity: boolean;
  vortexMode?: boolean;
  canPlay: boolean;
  hasBase: boolean;
  onPlay: () => void;
  onAttackSec: () => void;
  onAttackPerm: (permanentId: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const selDef = selCardId ? getCardDefinition(selCardId) : undefined;
  if (selDef) {
    const isEgg = selDef.kinds.includes(CardKind.DigiEgg);
    return (
      <div
        className="game-action-bar game-action-bar--contextual"
        style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "4px 0 9px" }}
      >
        <span style={{ fontSize: 13, color: "var(--ds-foreground-muted)" }}>
          <strong style={{ color: "var(--ds-foreground)" }}>{selDef.nameEn}</strong>
          {isEgg
            ? t("game.digiEgg")
            : ` · ${selDef.playCost < 0 ? t("game.noCost") : t("game.costsMemory", { count: selDef.playCost })}`}
        </span>
        {canPlay ? (
          <Button size="sm" icon={Icons.Sparkles} sound={false} onClick={onPlay}>
            {playButtonLabel(selDef.kinds, t)}
          </Button>
        ) : null}
        {hasBase ? (
          <span
            style={{ fontSize: 12.5, color: "var(--ds-primary)", display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <Icons.ChevronUp size={14} />
            {t("game.clickToDigivolve")}
          </span>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    );
  }
  if (attackerCardId) {
    // Both target lists are the server's own projection for this declaration mode, so a
    // ＜Vortex＞ attack shows only what ＜Vortex＞ can legally hit (§16-33: opponent Digimon,
    // unless a grant relaxes it into the security target too).
    return (
      <div
        className="game-action-bar game-action-bar--contextual"
        style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "4px 0 9px" }}
      >
        <span style={{ fontSize: 13, color: "var(--ds-foreground-muted)" }}>
          {vortexMode ? t("game.vortexAttackWith") : t("game.attackWith")}{" "}
          <strong style={{ color: "var(--ds-foreground)" }}>
            {getCardDefinition(attackerCardId)?.nameEn ?? attackerCardId}
          </strong>{" "}
          →
        </span>
        {canAttackSecurity ? (
          <Button size="sm" variant="danger" icon={Icons.Shield} sound={false} onClick={onAttackSec}>
            {t("game.opponentSecurity")}
          </Button>
        ) : null}
        {attackTargets.map((p) => (
          <Button
            key={p.permanentId}
            size="sm"
            variant="secondary"
            icon={Icons.Swords}
            sound={false}
            onClick={() => onAttackPerm(p.permanentId)}
          >
            {getCardDefinition(p.topCard?.cardId ?? "")?.nameEn ?? t("game.digimon")}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    );
  }
  return (
    <div
      className="game-action-bar game-action-bar--idle"
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 6px 4px" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Avatar name={youName} color={youColor} avatarId={avatarId} avatarUrl={avatarUrl} size={28} />
        <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ds-foreground)" }}>{youName}</span>
        <span style={{ fontFamily: "var(--ds-font-mono)", fontSize: 11.5, color: "var(--ds-foreground-muted)" }}>
          {t("game.handLabel", { count: handCount })}
        </span>
      </div>
      <span style={{ fontSize: 12.5, color: "var(--ds-foreground-muted)" }}>{t("game.dragHint")}</span>
    </div>
  );
}

function Sidebar({
  phase,
  turnCount,
  memory,
  isMyTurn,
  canMove,
  hasBreeding,
  canHatch,
  narrow,
  log,
  onHatchOrMove,
  onEndPhase,
  onSurrender,
}: {
  phase: Phase;
  turnCount: number;
  memory: number;
  isMyTurn: boolean;
  canMove: boolean;
  hasBreeding: boolean;
  canHatch: boolean;
  /** Touch layout: the action row is a two-button bar, not a labelled panel. */
  narrow?: boolean;
  log: LogLine[];
  onHatchOrMove: () => void;
  onEndPhase: () => void;
  onSurrender: () => void;
}) {
  const { t } = useTranslation();
  const canBreed = canUseBreedingAction({ phase, isMyTurn, canHatch, canMove });
  return (
    <aside
      className="game-sidebar"
      style={{
        width: 296,
        flexShrink: 0,
        borderLeft: "1px solid var(--ds-border)",
        background: "var(--ds-surface)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--ds-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Logo size={18} sub={false} />
          <Badge tone={isMyTurn ? "primary" : "neutral"}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isMyTurn ? "var(--ds-primary)" : "var(--ds-foreground-muted)",
              }}
            />
            {isMyTurn ? t("game.yourTurn") : t("game.opponentsTurn")}
          </Badge>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {PHASES.map((p) => (
            <div
              key={p}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "6px 2px",
                borderRadius: 8,
                background: phase === p ? "var(--ds-primary)" : "var(--ds-surface-muted)",
                color: phase === p ? "#fff" : "var(--ds-foreground-muted)",
                fontSize: 9.5,
                fontWeight: 700,
              }}
            >
              {t(`game.phase.${p}` as const)}
            </div>
          ))}
        </div>
        <div
          style={{
            fontFamily: "var(--ds-font-mono)",
            fontSize: 11,
            color: "var(--ds-foreground-muted)",
            marginTop: 8,
            textAlign: "center",
          }}
        >
          {t("game.turnAndMemory", { turn: turnCount, memory: `${memory > 0 ? "+" : ""}${memory}` })}
        </div>
      </div>

      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--ds-border)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ds-foreground-muted)",
          }}
        >
          {t("game.actions")}
        </div>
        {/* On a phone the action row is a bare two-button bar with no heading, so a
            disabled button reads as an available one. Drop it instead, and let the
            end-phase button take the width. */}
        {narrow && !canBreed ? null : (
          <Button size="sm" variant="secondary" full icon={Icons.Dices} onClick={onHatchOrMove} disabled={!canBreed}>
            {hasBreeding ? (canMove ? t("game.moveToBattle") : t("game.raising")) : t("game.hatchEgg")}
          </Button>
        )}
        <Button size="md" full icon={Icons.ChevronRight} onClick={onEndPhase} disabled={!isMyTurn}>
          {t("game.endPhase")}
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ds-foreground-muted)",
            marginBottom: 10,
          }}
        >
          {t("game.matchLog")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {log.length === 0 ? (
            <span style={{ fontSize: 12, color: "var(--ds-foreground-disabled)" }}>{t("game.noActions")}</span>
          ) : null}
          {log.map((e, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 8,
                fontSize: 12,
                lineHeight: 1.35,
                opacity: i === 0 ? 1 : Math.max(0.4, 0.78 - i * 0.05),
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  marginTop: 5,
                  flexShrink: 0,
                  background:
                    e.kind === "you"
                      ? "var(--ds-primary)"
                      : e.kind === "opp"
                        ? "var(--ds-danger)"
                        : "var(--ds-foreground-disabled)",
                }}
              />
              <span style={{ color: "var(--ds-foreground-secondary)" }}>{e.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{ padding: "12px 16px", borderTop: "1px solid var(--ds-border)", background: "var(--ds-surface-muted)" }}
      >
        <Button size="sm" variant="ghost" full icon={Icons.LogOut} onClick={onSurrender}>
          {t("game.surrender")}
        </Button>
      </div>
    </aside>
  );
}
