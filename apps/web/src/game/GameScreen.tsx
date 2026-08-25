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
  parseTriggerKey,
  type AttackTarget,
  type DecisionResponse,
  type DigiXrosRequirement,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { rejectionMessage } from "../rejectionMessages";
import { useTranslation } from "../i18n";
import { useRoom, type MatchMode, type UseRoomResult } from "../net/useRoom";
import { intents } from "../net/intents";
import { joinWithBot } from "../net/client";
import type { CSSProperties } from "react";
import type { StartMode } from "../screens/Lobby";
import type { AegisJoinOptions } from "../net/types";
import { Avatar, Badge, Button, Logo, type Screen } from "../design/primitives";
import type { DigimonWorldAvatarId } from "../account/avatars";
import { CardFull } from "../design/cards";
import { Icons } from "../design/icons";
import { BugReportDialog } from "../bugs/BugReportDialog";
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
  HAND_MIN_EXPOSURE_TOUCH,
  MemoryGauge,
  PermanentView,
  Pile,
  TurnControl,
  type HandEntry,
} from "./boardPieces";
import {
  dragIntentFor,
  dragIntentLabelOffsetPx,
  dragIntentLabelKey,
  type DragIntent,
  type DropTarget,
} from "./dragIntents";
import { isBreedingWindow, turnControlState } from "./turnControl";
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
  triggerCardId,
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
  DigiXrosMaterialOverlay,
  EvadeOverlay,
  EvoCostChoiceOverlay,
  GameOverOverlay,
  MulliganOverlay,
  playerFacingEffectClause,
  playerFacingPromptText,
  StackViewerOverlay,
  TrashViewerOverlay,
  WaitingOverlay,
  type DigiXrosCandidate,
  type DigiXrosEligibleExpander,
  type StackCard,
} from "./overlays";
import { MatchHistorySheet, OpponentActionFeed } from "./OpponentActionFeedView";
import { hasOpenCombatPrompt } from "./opponentActionFeed";
import { AttackAnnouncementBanner, SidePanelStack } from "./SidePanelStack";
import { NoticeStack } from "./NoticeStack";
import { SecurityBranch, SecurityClash, SecurityEdgeFlash } from "./SecurityClashView";
import { ZoneShowcase } from "./ZoneShowcase";
import { CardBurst } from "./CardBurst";
import { useMatchCues } from "./useMatchCues";
import { BATTLE_TIMING_STYLE, TIMINGS } from "./timings";
import { ownPermanentTapDestination } from "./ownPermanentStack";
import { pressGesture, swallowNextClick } from "./pressGesture";
import { useOpponentActionFeed } from "./useOpponentActionFeed";
import { COARSE_POINTER_QUERY, useMediaQuery } from "../design/useMediaQuery";
import { TargetingSpotlight } from "./TargetingSpotlight";
import type { SpotlightSubject } from "./spotlight";
import { pendingFateBadges } from "./pendingFate";
import { predictedMemory } from "./memoryArc";
import { BoardOptionalPrompt, BoardSelectionRail, OpponentSelectingPill } from "./BoardDecisionRail";
import {
  decisionPresentation,
  fieldSlots,
  sourcePermanentIdOf,
  triggerClauseSummary,
  triggerSource,
} from "./decisionPresentation";

const PHASES: Phase[] = [Phase.Active, Phase.Draw, Phase.Breeding, Phase.Main, Phase.End];

/**
 * Phone layout: touch sheets, compact everything. Mirrors the CSS blocks of the
 * same name — a phone on its side is ~800px wide, so the layout is keyed on the
 * short viewport as well, or a landscape phone would fall into the pointer
 * layout and lose the action strip along with every touch sheet.
 */
const NARROW_LAYOUT_QUERY = "(width < 600px), (height < 520px) and (orientation: landscape)";
/**
 * Tablet and split-screen widths. The board keeps its pointer interactions but the
 * piles shrink, because the sidebar moves under the board and leaves the rails too
 * short to hold four full-size piles.
 */
const COMPACT_PILES_QUERY = "(width < 960px), (height < 520px) and (orientation: landscape)";
/**
 * A board this short cannot show a full-size Digimon in each battle row, so the
 * permanents drop to their compact size rather than being clipped by the row.
 */
const SHORT_BOARD_QUERY = "(height < 820px)";
/**
 * A phone on its side. Both battle rows, the memory band, the dock and the
 * header share ~390px, which is under what even a compact Digimon needs, so the
 * battle rows name their own card width.
 */
const LANDSCAPE_PHONE_QUERY = "(height < 520px) and (orientation: landscape)";
/** Card width in a battle row on a landscape phone. */
const LANDSCAPE_PHONE_PERMANENT_WIDTH = 58;
/**
 * Split-screen and small laptops, where game.css narrows the pile rails to 104px.
 * The rail breeding slot must shrink with them or its permanent (1.16× the slot)
 * paints over the battle area.
 */
const NARROW_RAIL_QUERY = "(width < 1240px)";
/** Slot width whose 1.16× permanent exactly fits the 104px rail's 84px content box. */
const NARROW_RAIL_SLOT_WIDTH = 72;

/**
 * `deferred` marks a touch gesture whose direction is not yet known: the pointer is
 * left to the browser until `move` decides between a sideways swipe (scroll the row)
 * and a drag (play / attack). `capture` is the element to capture onto once it does.
 */
type DragOrigin = { deferred?: boolean; capture?: Element };

/** A drop area under the pointer: the `data-drop` name it carries, and the id it names. */
type DropZoneHit = { target: DropTarget; id?: string };

/**
 * The drop area under a point — the smallest one, so a permanent inside the
 * battle row wins over the row itself. The same lookup answers "what would this
 * drop do" while the card is still in the air and "what did it do" on release.
 */
function dropZoneAt(cx: number, cy: number): DropZoneHit | null {
  let zone: Element | null = null;
  let bestArea = Infinity;
  document.querySelectorAll("[data-drop]").forEach((candidate) => {
    const rect = candidate.getBoundingClientRect();
    if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) return;
    const area = rect.width * rect.height;
    if (area >= bestArea) return;
    bestArea = area;
    zone = candidate;
  });
  if (!zone) return null;
  const element = zone as Element;
  const target = element.getAttribute("data-drop");
  if (!target) return null;
  return { target: target as DropTarget, id: element.getAttribute("data-id") ?? undefined };
}

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
  signedIn = false,
  demoConnection,
}: {
  joinOptions: AegisJoinOptions;
  identityColor: ColorName;
  identityAvatarId?: DigimonWorldAvatarId | null;
  identityAvatarUrl?: string | null;
  startMode?: StartMode;
  roomCode?: string;
  onExit: (screen: Screen) => void;
  /** Only shapes what the report dialog says about follow-up questions; reporting needs no account. */
  signedIn?: boolean;
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
  const landscapePhone = useMediaQuery(LANDSCAPE_PHONE_QUERY);
  const narrowRail = useMediaQuery(NARROW_RAIL_QUERY);
  const coarsePointer = useMediaQuery(COARSE_POINTER_QUERY);
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
  const [securityView, setSecurityView] = useState<"you" | "opp" | null>(null); // which player's security modal is open
  const [picks, setPicks] = useState<string[]>([]);
  // A board-mode decision the viewer asked to see in the dialog instead (Escape
  // or the rail's back arrow). Reset with every new decision.
  const [decisionAsDialog, setDecisionAsDialog] = useState(false);
  const [oppInspector, setOppInspector] = useState<{ permanentId: string; x: number; y: number } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
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
  // Where each permanent last stood, in board coordinates. A deletion is narrated after
  // the board has already dropped the permanent, so the burst needs the last measurement
  // rather than the (gone) element.
  const permCentersRef = useRef<Record<string, { x: number; y: number }>>({});
  const yourSecRef = useRef<HTMLDivElement | null>(null);
  const oppSecRef = useRef<HTMLDivElement | null>(null);
  const yourDeckRef = useRef<HTMLDivElement | null>(null);
  const oppDeckRef = useRef<HTMLDivElement | null>(null);
  const yourHandDockRef = useRef<HTMLDivElement | null>(null);
  const oppHandStripRef = useRef<HTMLDivElement | null>(null);
  const [arrow, setArrow] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);

  const handleTapRef = useRef<((d: DragState) => void) | null>(null);
  const handleDropRef = useRef<((d: DragState, cx: number, cy: number) => void) | null>(null);
  // The drop area the pointer is currently over, so the ghost can carry the name
  // of the intent that release would send.
  const [dragHover, setDragHover] = useState<DropZoneHit | null>(null);
  // Which hand card the pointer is over, so the memory gauge can trace where a
  // play would put memory before the card is even picked up.
  const [hoveredHandInstanceId, setHoveredHandInstanceId] = useState<string | undefined>(undefined);
  // The hand card a refusal belongs to. The server's `actionRejected` names the
  // intent and the reason, not the card, so the card is the one this client last
  // sent a play for — the only thing that could have been refused.
  const [shakeHandInstanceId, setShakeHandInstanceId] = useState<string | undefined>(undefined);
  const lastPlayAttemptRef = useRef<string | undefined>(undefined);
  // Measured boxes of the permanents a target prompt is offering, for the mask.
  const [spotlightSubjects, setSpotlightSubjects] = useState<readonly SpotlightSubject[]>([]);
  const [boardSize, setBoardSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Declared before `cues` because the cue hook reports rejections through it;
  // both bodies only run once the other binding exists.
  const ping = (message: string) => {
    playSound("error");
    cues.raiseRejection(message);
    const offending = lastPlayAttemptRef.current;
    if (!offending) return;
    setShakeHandInstanceId(offending);
    // The class is what plays the shake, so it is taken off once the keyframes
    // are done; a second refusal on the same card re-adds it and restarts them.
    setTimeout(
      () => setShakeHandInstanceId((current) => (current === offending ? undefined : current)),
      TIMINGS.cardShake,
    );
  };

  // Every cue the server provokes: sounds, panels, banners, the security clash,
  // the draw flights. The hook sequences them on the animation queue; this
  // component only renders what it reports.
  const cues = useMatchCues({
    events,
    state,
    viewerSeat,
    mulliganOpen: decision?.kind === "mulligan",
    anchors: {
      board: boardRef,
      permanentCenter: (permanentId) => permCentersRef.current[permanentId],
      yourDeck: yourDeckRef,
      oppDeck: oppDeckRef,
      yourHandDock: yourHandDockRef,
      oppHandStrip: oppHandStripRef,
    },
    onActionRejected: (reason) => ping(rejectionMessage(reason, t)),
  });
  const {
    attackAnnouncement,
    attackLunge,
    combatImpactIds,
    dpPulses,
    phaseBanner,
    deleteBursts,
    drawBursts,
    drawFlights,
    pendingPermanentIds,
    permanentBursts,
    securityBranch,
    securityBreak,
    securityClash,
    securityHitSeat,
    sidePanels,
    turnTransition,
    unsuspendSweep,
    zoneShowcase,
  } = cues;
  const playGameCue = cues.playCue;

  /**
   * The unsuspend phase sweeps a board rather than snapping it: each slot starts its
   * rotation a little after the one before it. Only the sweeping seat is staggered — a
   * single card suspending to declare an attack must turn immediately.
   */
  const unsuspendStagger = (seat: Seat, index: number) =>
    unsuspendSweep?.seat === seat ? index * TIMINGS.suspendStagger : 0;

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
    securityView ||
    evoCostChoice ||
    digiXrosPick ||
    actionConfirm ||
    securityClash ||
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

  useEffect(
    () => () => {
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
    setSecurityView(null);
    setDigiXrosPick(null);
    setOppInspector(null);
    setDecisionAsDialog(false);
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
      const opponentSecurityEl = oppSecRef.current;
      if (!b || !a || !opponentSecurityEl) {
        setArrow(null);
        return;
      }
      const br = b.getBoundingClientRect();
      const ar = a.getBoundingClientRect();
      const tr = opponentSecurityEl.getBoundingClientRect();
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
      // `deferred` is set for every non-mouse pointer, so it also says which slop applies.
      const gesture = pressGesture({ dx: e.clientX - d.ox, dy: e.clientY - d.oy, touch: d.deferred === true });
      if (!d.started && gesture === "press") {
        setDrag({ ...d, x: e.clientX, y: e.clientY });
        return;
      }
      if (!d.started) {
        if (gesture === "scroll") {
          setDrag(null);
          return;
        }
        e.preventDefault();
        d.capture?.setPointerCapture?.(e.pointerId);
      }
      setDrag({ ...d, x: e.clientX, y: e.clientY, started: true });
      const hit = dropZoneAt(e.clientX, e.clientY);
      setDragHover((current) => (current?.target === hit?.target && current?.id === hit?.id ? current : (hit ?? null)));
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d) {
        if (d.started) handleDropRef.current?.(d, e.clientX, e.clientY);
        else {
          // A tap opens a sheet right under the finger that made it, and the click the
          // browser sends after the tap would land on whatever mounted there — zooming
          // the card, or dismissing the sheet before it was ever read.
          swallowNextClick();
          handleTapRef.current?.(d);
        }
      }
      setDrag(null);
      setDragHover(null);
    };
    const cancel = () => {
      setDrag(null);
      setDragHover(null);
    };
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

  // Re-measured whenever the board's population changes, which is also the commit that
  // drops a deleted permanent: the survivors are re-measured and the deleted permanent's
  // last position stays behind for its burst.
  const battleAreaSignature = `${you?.battleArea.map((p) => p.permanentId).join(",") ?? ""}|${
    opp?.battleArea.map((p) => p.permanentId).join(",") ?? ""
  }`;
  const permInstanceIds = new Map(
    [...(you?.battleArea ?? []), ...(opp?.battleArea ?? [])].flatMap((perm) =>
      perm.topCard?.instanceId ? [[perm.permanentId, perm.topCard.instanceId] as const] : [],
    ),
  );
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    for (const [permanentId, element] of Object.entries(permRefs.current)) {
      if (!element?.isConnected) continue;
      const rect = element.getBoundingClientRect();
      if (!rect.width) continue;
      const center = {
        x: rect.left + rect.width / 2 - boardRect.left,
        y: rect.top + rect.height / 2 - boardRect.top,
      };
      permCentersRef.current[permanentId] = center;
      // A deletion by an effect names the card instance rather than the permanent, so the
      // top card is remembered as a second way in to the same position.
      const topInstanceId = permInstanceIds.get(permanentId);
      if (topInstanceId) permCentersRef.current[topInstanceId] = center;
    }
  }, [battleAreaSignature]);

  // The mask's holes. The prompt's candidate list is written to the ref during
  // render (it is derived far below, after the connection gates); the boxes are
  // measured here, and the state is only replaced when the geometry actually
  // moved, so an effect that runs on every commit still settles in one pass.
  const spotlightRequestRef = useRef<{ ids: readonly string[]; suspended: ReadonlySet<string> }>({
    ids: [],
    suspended: new Set(),
  });
  const spotlightAppliedRef = useRef("");
  useEffect(() => {
    const board = boardRef.current;
    const { ids, suspended } = spotlightRequestRef.current;
    if (!board || ids.length === 0) {
      if (spotlightAppliedRef.current !== "") {
        spotlightAppliedRef.current = "";
        setSpotlightSubjects([]);
      }
      return;
    }
    const boardRect = board.getBoundingClientRect();
    const next: SpotlightSubject[] = [];
    for (const id of ids) {
      const element = permRefs.current[id];
      if (!element?.isConnected) continue;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      next.push({
        id,
        x: rect.left - boardRect.left,
        y: rect.top - boardRect.top,
        width: rect.width,
        height: rect.height,
        suspended: suspended.has(id),
      });
    }
    const signature = `${Math.round(boardRect.width)}x${Math.round(boardRect.height)}|${next
      .map(
        (subject) =>
          `${subject.id}:${Math.round(subject.x)}:${Math.round(subject.y)}:${Math.round(subject.width)}:${Math.round(subject.height)}:${subject.suspended ? 1 : 0}`,
      )
      .join(",")}`;
    if (signature === spotlightAppliedRef.current) return;
    spotlightAppliedRef.current = signature;
    setSpotlightSubjects(next);
    setBoardSize({ width: boardRect.width, height: boardRect.height });
  });

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
  const breedingWindow = isBreedingWindow({ phase: state.phase, turnSeat: state.turnSeat, viewerSeat });
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
          playGameCue("digivolve");
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
      lastPlayAttemptRef.current = instanceId;
      playGameCue("cardPlay");
      intents.playCard(room, instanceId);
    }
    clearSel();
  };
  const digivolve = (permanentId: string, instanceId: string, useAlternateCost?: boolean) => {
    if (room) {
      lastPlayAttemptRef.current = instanceId;
      playGameCue("digivolve");
      intents.digivolve(room, permanentId, instanceId, useAlternateCost);
    }
    clearSel();
  };
  const attack = (attackerPermanentId: string, target: AttackTarget, vortex?: boolean) => {
    if (room) {
      playGameCue("attackDeclare");
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
      // No server event narrates what the viewer picked, so the panel is raised
      // from the answer itself, in the order the cards were chosen.
      const revealed = new Map(decision.options?.visibleCards?.map((card) => [card.instanceId, card.cardId]));
      cues.showSelection(
        picks.flatMap((id) => [instanceIndex.get(id) ?? revealed.get(id)].filter((c) => c !== undefined)),
      );
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

  /**
   * What releasing here would do, or null where the drop would be refused. Every
   * answer is the server's projection read back through `dragIntents.ts`; the
   * board only paints it.
   */
  const dragIntentAt = (hit: DropZoneHit | null): DragIntent | null => {
    if (!hit || !drag?.started) return null;
    if (drag.kind === "attack") {
      const attacker = you.battleArea.find((p) => p.permanentId === drag.permId);
      return dragIntentFor({
        drag: { kind: "attack" },
        target: hit.target,
        canAttackPlayer: attacker?.canAttackPlayer === true,
        attackable: hit.id !== undefined && attacker?.attackablePermanentIds.includes(hit.id) === true,
      });
    }
    const definition = getCardDefinition(drag.cardId);
    const held = {
      kind: "play" as const,
      isOption: definition?.kinds.includes(CardKind.Option) ?? false,
      isDigiEgg: definition?.kinds.includes(CardKind.DigiEgg) ?? false,
    };
    const base = hit.target === "perm-you" ? you.battleArea.find((p) => p.permanentId === hit.id) : undefined;
    const route = base
      ? handCardEvolutionRoute(drag.cardId, you.battleArea, digivolveTargetsOf(drag.instanceId).includes(hit.id ?? ""))
      : undefined;
    return dragIntentFor({
      drag: held,
      target: hit.target,
      evolutionRoute: route?.kind,
      digivolvable: !!you.breeding && digivolveTargetsOf(drag.instanceId).includes(you.breeding.permanentId),
    });
  };

  /** The `data-drag-intent` an area wears while it would accept the card in the air. */
  const dropIntentAttrs = (target: DropTarget, id?: string): Record<string, string> => {
    const intent = dragIntentAt({ target, id });
    return intent ? { "data-drag-intent": intent } : {};
  };

  const hoveredDragIntent = dragIntentAt(dragHover);

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
    // A tap on a touch layout does one thing: open the card's sheet. Toggling the
    // selection off meant tapping a card could leave nothing on screen, which read
    // as a card that had simply ignored the tap.
    if (narrowGameLayout) {
      playSound("select");
      setHandSel(entry.instanceId);
      setHandPreview(entry.instanceId);
      setSelPerm(null);
      return;
    }
    setHandSel((selected) => {
      const next = selected === entry.instanceId ? null : entry.instanceId;
      if (next) playSound("select");
      return next;
    });
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
    const zone = dropZoneAt(cx, cy);
    if (!zone) return;
    const { target, id } = zone;

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
    else inspectorTimerRef.current = window.setTimeout(open, TIMINGS.inspectorOpen);
  };

  const hideOpponentInspector = () => {
    if (inspectorTimerRef.current) window.clearTimeout(inspectorTimerRef.current);
    inspectorTimerRef.current = window.setTimeout(() => setOppInspector(null), TIMINGS.inspectorClose);
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
    const activatable = isMyTurn ? parseActivatable(perm.activatableEffectsJson) : [];
    const destination = ownPermanentTapDestination({
      canAttack: canAttackWith(perm),
      canVortex: canVortexAttackWith(perm),
      canPromote,
      hasEffects: activatable.length > 0,
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
      playGameCue("hatch");
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

  // Turn order is server truth: `matchStarted` names the seat that takes turn 1.
  // Nothing is shown until that event has arrived rather than inferring a side.
  const viewerTurnOrder = (() => {
    const started = events.find((event) => event.kind === "matchStarted");
    if (started?.kind !== "matchStarted") return undefined;
    return started.firstSeat === viewerSeat ? ("first" as const) : ("second" as const);
  })();

  const attackerPerm = selPerm ? you.battleArea.find((p) => p.permanentId === selPerm) : undefined;
  const draggedAttackerPerm =
    drag?.kind === "attack" ? you.battleArea.find((p) => p.permanentId === drag.permId) : undefined;
  // The declaration the action bar is currently offering targets for. A ＜Vortex＞
  // declaration is scored under its own rules, so it reads its own projection.
  const attackTargets = attackTargetsOf(attackerPerm, opp.battleArea, vortexMode);
  const canAttackSecurity = canAttackPlayerWith(attackerPerm, vortexMode);

  // ----- the open decision, and where it is answered -----
  // Everything below reads the server's decision payload; the client adds no
  // legality of its own, it only decides which surface the payload renders on.
  const viewerDecision = decision && decision.seat === viewerSeat ? decision : undefined;
  const allPermanents = [...you.battleArea, ...opp.battleArea];
  const handInstanceIds = handEntries.map((entry) => entry.instanceId);
  const decisionSourceCardId = viewerDecision ? decisionEffectSource(viewerDecision, events) : undefined;
  const decisionSourcePermanentId =
    viewerDecision?.kind === "optional" ? sourcePermanentIdOf(decisionSourceCardId, allPermanents) : undefined;
  const boardPresentation = viewerDecision
    ? decisionPresentation({
        decision: viewerDecision,
        handInstanceIds,
        sourcePermanentId: decisionSourcePermanentId,
      })
    : "dialog";
  const answerOnBoard = boardPresentation === "board" && !decisionAsDialog;
  const decisionHighlightPermanentId = answerOnBoard ? decisionSourcePermanentId : undefined;

  const decisionSelectable = new Set(viewerDecision?.options?.candidateInstanceIds ?? []);
  const decisionVisible = viewerDecision ? decisionVisibleCards(viewerDecision.options, instanceIndex) : [];
  const decisionVisibleCardIds = new Map(decisionVisible.map((card) => [card.instanceId, card.cardId]));
  const decisionInstanceColors = decisionCardColors(decisionVisible);
  const decisionDifferentColors = viewerDecision?.options?.differentColors === true;
  const decisionDistinctCardIds = viewerDecision?.options?.distinctCardIds === true;
  // CR 4-24-2: a multicolor card only needs one color no other pick uses, so the
  // picks stay legal as long as a distinct color can still be assigned to each.
  const decisionAllowsPick = (instanceId: string) =>
    decisionSelectable.has(instanceId) &&
    differentColorsAllowCandidate(instanceId, picks, decisionInstanceColors, decisionDifferentColors) &&
    distinctCardIdsAllow(instanceId, picks, decisionVisibleCardIds, decisionDistinctCardIds);
  const toggleDecisionPick = (instanceId: string) => {
    if (!decisionAllowsPick(instanceId)) return;
    setPicks((current) => {
      if (current.includes(instanceId)) return current.filter((id) => id !== instanceId);
      const max = viewerDecision?.options?.max ?? 1;
      const keep = max > 1 ? current.slice(-(max - 1)) : [];
      return [...keep, instanceId];
    });
  };
  const decisionMin = viewerDecision?.options?.min ?? 1;
  const decisionMax = viewerDecision?.options?.max ?? 1;
  // What the resolving effect will do to each target the viewer has picked. The
  // fate is the server's own projection (`options.targetFate`); a prompt that
  // carries none badges nothing.
  const fateBadges = pendingFateBadges({ decision: viewerDecision, picks, viewerSeat });

  // The cards a target selection currently offers, which is what the mask lights.
  // Every id here is a server projection read back off the board — the attack
  // targets the server listed for the chosen attacker, and the bases it listed
  // for the chosen hand card. Only the tap flows arm the mask: a drag already
  // carries its own ghost and outlined drop areas, and a second dark pass over
  // that would be noise. The breeding step keeps its own dim (`breedingWindow`).
  const spotlightIds = (() => {
    if (breedingWindow) return [];
    if (selPerm) return attackTargetIdsOf(attackerPerm, vortexMode);
    if (handSel && handIsDigi) return you.battleArea.filter(eligibleBase).map((p) => p.permanentId);
    return [];
  })();
  spotlightRequestRef.current = {
    ids: spotlightIds,
    suspended: new Set(allPermanents.filter((permanent) => permanent.isSuspended).map((p) => p.permanentId)),
  };
  const spotlightOpen = spotlightIds.length > 0;

  // Where memory would land if the card in hand were played. The figure is the
  // card's PRINTED cost — the server projects whether a play is legal, not what
  // it would finally charge — so this is a dashed prediction and gates nothing.
  const predictionCardId = (() => {
    if (drag?.kind === "play" && drag.started) return drag.cardId;
    if (hoveredHandInstanceId === undefined) return undefined;
    const entry = handEntries.find((candidate) => candidate.instanceId === hoveredHandInstanceId);
    return entry?.playableFromHand === true ? entry.cardId : undefined;
  })();
  const predictionCost = predictionCardId ? getCardDefinition(predictionCardId)?.playCost : undefined;
  const memoryPrediction =
    predictionCost !== undefined && predictionCost >= 0 ? predictedMemory(memory, predictionCost) : undefined;

  const triggerDetails =
    viewerDecision?.kind === "orderTriggers"
      ? (viewerDecision.options?.triggerKeys ?? []).map((key, index) => {
          const slots = fieldSlots(allPermanents);
          const source = triggerSource(parseTriggerKey(key).instanceId, {
            fieldSlots: slots,
            handInstanceIds,
          });
          const cardId = viewerDecision.options?.triggerCardIds?.[index] ?? triggerCardId(key);
          const clause =
            playerFacingEffectClause({
              cardId,
              timing: viewerDecision.options?.timing,
              description: undefined,
            }) ?? getCardDefinition(cardId)?.effectText;
          return {
            sourceLabel:
              source.zone === "field"
                ? t("overlay.triggerSourceField", { position: source.position })
                : source.zone === "hand"
                  ? t("overlay.triggerSourceHand")
                  : undefined,
            summary: triggerClauseSummary(clause),
          };
        })
      : [];

  // ----- overlays -----
  const stageEl = typeof document !== "undefined" ? document.getElementById("aegis-stage") : null;
  const overlays = (
    <>
      {decision && decision.seat === viewerSeat && decision.kind === "mulligan" ? (
        <MulliganOverlay
          handCardIds={handEntries.map((h) => h.cardId)}
          turnOrder={viewerTurnOrder}
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

      {viewerDecision && viewerDecision.kind !== "mulligan" && !answerOnBoard
        ? (() => {
            const sourceCounts = decisionSourceCounts(allPermanents);
            const permanentDetails = decisionPermanentDetails(allPermanents);
            return (
              <DecisionOverlay
                key={viewerDecision.decisionId}
                request={viewerDecision}
                sourceCardId={decisionSourceCardId}
                candidates={decisionVisible.map((card) => {
                  const details = permanentDetails.get(card.instanceId);
                  return {
                    instanceId: card.instanceId,
                    cardId: card.cardId,
                    selectable: decisionAllowsPick(card.instanceId),
                    sourceCount: sourceCounts.get(card.instanceId),
                    currentDP: details?.currentDP,
                    isSuspended: details?.isSuspended,
                  };
                })}
                picks={picks}
                triggerDetails={triggerDetails}
                onTogglePick={toggleDecisionPick}
                onRespond={respondDecision}
              />
            );
          })()
        : null}

      {viewerDecision && answerOnBoard && viewerDecision.kind === "selectCards" ? (
        <BoardSelectionRail
          key={viewerDecision.decisionId}
          prompt={
            playerFacingPromptText(viewerDecision.promptText, viewerDecision.kind) ??
            (decisionMin === decisionMax
              ? t("overlay.selectCardsSubtitle", { count: decisionMax })
              : t("overlay.selectCardsRangeSubtitle", { range: `${decisionMin}–${decisionMax}` }))
          }
          clause={
            decisionSourceCardId
              ? playerFacingEffectClause({
                  cardId: decisionSourceCardId,
                  timing: viewerDecision.options?.timing,
                  description: viewerDecision.options?.effectText,
                })
              : viewerDecision.options?.effectText
          }
          min={decisionMin}
          max={decisionMax}
          pickCount={picks.length}
          canConfirm={picks.length >= decisionMin && picks.length <= decisionMax}
          onConfirm={() => respondDecision({ kind: "selectCards", instanceIds: picks })}
          onNoSelection={() => respondDecision({ kind: "selectCards", instanceIds: [] })}
          onOpenDialog={() => setDecisionAsDialog(true)}
        />
      ) : null}

      {viewerDecision && answerOnBoard && viewerDecision.kind === "optional" ? (
        <BoardOptionalPrompt
          key={viewerDecision.decisionId}
          sourceCardId={decisionSourceCardId}
          prompt={playerFacingPromptText(viewerDecision.promptText, viewerDecision.kind)}
          clause={
            decisionSourceCardId
              ? playerFacingEffectClause({
                  cardId: decisionSourceCardId,
                  timing: viewerDecision.options?.timing,
                  description: viewerDecision.options?.effectText,
                })
              : viewerDecision.options?.effectText
          }
          onUse={() => respondDecision({ kind: "optional", accept: true })}
          onDecline={() => respondDecision({ kind: "optional", accept: false })}
          onOpenDialog={() => setDecisionAsDialog(true)}
        />
      ) : null}

      {state.pendingDecision && state.pendingDecision.seat !== viewerSeat && !state.gameOver ? (
        <OpponentSelectingPill />
      ) : null}

      {state.phase === Phase.Breeding && isMyTurn && !decision && !securityClash
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

      {securityBreak && securityBreak.phase === "break" && !state.gameOver ? (
        <SecurityEdgeFlash key={securityBreak.key} scene={securityBreak} />
      ) : null}

      {securityClash && !state.gameOver ? <SecurityClash key={securityClash.key} scene={securityClash} /> : null}

      {securityBranch && !state.gameOver ? <SecurityBranch key={securityBranch.key} scene={securityBranch} /> : null}

      {zoneShowcase && !securityClash && !state.gameOver ? (
        <ZoneShowcase key={zoneShowcase.key} showcase={zoneShowcase} />
      ) : null}

      {historyOpen ? <MatchHistorySheet log={log} onClose={() => setHistoryOpen(false)} /> : null}

      {bugReportOpen ? <BugReportDialog signedIn={signedIn} onClose={() => setBugReportOpen(false)} /> : null}

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
            playGameCue(actionConfirm.kind === "play" ? "cardPlay" : "digivolve");
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
                effects={
                  mine && isMyTurn
                    ? parseActivatable(perm.activatableEffectsJson).map((entry) => ({
                        label: entry.description,
                        onActivate: () => {
                          setCardMenu(null);
                          activateEffect(entry.instanceId, entry.effectKey);
                        },
                      }))
                    : []
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

      {securityView
        ? (() => {
            const owner = securityView === "you" ? you : opp;
            const ownerLabel =
              securityView === "you"
                ? t("game.yourSecurityPile")
                : t("game.oppSecurityPile", { name: opp.displayName || t("game.opponent") });
            // Only face-up security cards are public; face-down cards stay hidden
            // even from their owner (the stack cannot be looked at, per the rules).
            const faceUpCardIds = Array.from(owner.security ?? [])
              .filter((card) => card?.faceUp)
              .map((card) => card.cardId);
            return (
              <TrashViewerOverlay
                title={ownerLabel}
                cardIds={faceUpCardIds}
                countLabel={t("overlay.securityCount", { faceUp: faceUpCardIds.length, count: owner.securityCount })}
                emptyLabel={t("overlay.securityNoFaceUp")}
                sheet={narrowGameLayout}
                onClose={() => setSecurityView(null)}
              />
            );
          })()
        : null}
    </>
  );

  return (
    <main
      className="game-layout"
      style={{
        height: "100%",
        display: "flex",
        background: "var(--ds-background)",
        overflow: "hidden",
        ...BATTLE_TIMING_STYLE,
      }}
    >
      <div
        className="game-board"
        ref={boardRef}
        // Clicking through an opponent's sequence fast-forwards it, the way the
        // reference client lets a player skip their cut-ins. Capture-phase and
        // passive: it never swallows the click the board was going to handle.
        onPointerDownCapture={() => cues.skipAnimations()}
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
              <div className="game-name-plate" style={{ fontWeight: 600, fontSize: 15, color: "var(--ds-foreground)" }}>
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
          <div
            className="game-opponent-hand"
            ref={oppHandStripRef}
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
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
            <>
              {/* Touch layout: the sidebar footer is out of reach mid-match, so both match-level
                  controls live in the header instead. */}
              <button
                className="game-mobile-bug"
                onClick={() => setBugReportOpen(true)}
                aria-label={t("bugReport.button")}
              >
                <Icons.Bug size={16} />
              </button>
              <button
                className="game-mobile-surrender"
                onClick={() => room && intents.surrender(room)}
                aria-label={t("game.surrender")}
              >
                <Icons.LogOut size={16} />
              </button>
            </>
          ) : (
            /* Desktop dropped the sidebar, so its match-level controls live here as
               the reference client's circular header buttons. */
            <div className="game-topbar-actions">
              <button
                className="game-topbar-button"
                onClick={() => setHistoryOpen(true)}
                aria-label={t("game.matchLog")}
              >
                <Icons.ScrollText size={17} />
              </button>
              <button
                className="game-topbar-button"
                onClick={() => setBugReportOpen(true)}
                aria-label={t("bugReport.button")}
              >
                <Icons.Bug size={17} />
              </button>
              <button
                className="game-topbar-button game-topbar-button--danger"
                onClick={() => room && intents.surrender(room)}
                aria-label={t("game.surrender")}
              >
                <Icons.LogOut size={17} />
              </button>
            </div>
          )}
        </header>

        {!feedPaused && !state.gameOver ? (
          <OpponentActionFeed
            current={opponentFeed.current}
            trail={opponentFeed.trail}
            pendingCount={opponentFeed.pending.length}
            onOpenHistory={() => setHistoryOpen(true)}
          />
        ) : null}

        {!state.gameOver ? <SidePanelStack panels={sidePanels} onDismiss={cues.dismissPanel} /> : null}

        {!state.gameOver ? <NoticeStack notices={cues.notices} onDismiss={cues.dismissNotice} /> : null}

        {attackAnnouncement && !state.gameOver ? <AttackAnnouncementBanner announcement={attackAnnouncement} /> : null}

        {/* Desktop replaced the sidebar with this slim ticker: the turn/memory
            readout plus the running match log, kept unobtrusive at the board's
            right edge. The header's log button opens the full history sheet. */}
        {!narrowGameLayout ? (
          <aside className="game-log-ticker" aria-label={t("game.matchLog")}>
            <div className="game-log-ticker__status">
              <span data-my-turn={isMyTurn || undefined}>
                {isMyTurn ? t("game.yourTurn") : t("game.opponentsTurn")}
              </span>
              <span>
                {t("game.turnAndMemory", { turn: state.turnCount, memory: `${memory > 0 ? "+" : ""}${memory}` })}
              </span>
            </div>
            <ol className="game-log-ticker__lines">
              {log.map((e, i) => (
                <li key={i} data-kind={e.kind}>
                  {e.text}
                </li>
              ))}
            </ol>
          </aside>
        ) : null}

        {phaseBanner ? (
          <div className="game-phase-banner" key={phaseBanner.key} role="status">
            <span>{t(phaseBanner.labelKey)}</span>
          </div>
        ) : null}

        {turnTransition ? (
          <div
            className={`game-turn-banner${
              turnTransition.nextSeat === viewerSeat ? " game-turn-banner--you" : " game-turn-banner--opp"
            }`}
          >
            <span>{turnTransition.nextSeat === viewerSeat ? t("game.yourTurn") : t("game.opponentsTurn")}</span>
          </div>
        ) : null}

        {/* field: left column / center / right column */}
        <div
          className="game-field"
          style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", overflow: "hidden", position: "relative" }}
        >
          {/* The breeding step is about one slot: the field dims behind the dock,
              which keeps the raising area, the hand that digivolves into it and
              the turn control lit. Notices, panels and dialogs all sit above. */}
          {breedingWindow ? <div className="game-breeding-mode" aria-hidden="true" /> : null}
          {/* The board darkens around exactly the cards the server offered. It is
              a drawing only — the lit cards underneath keep every pointer event. */}
          {spotlightOpen ? (
            <TargetingSpotlight subjects={spotlightSubjects} width={boardSize.width} height={boardSize.height} />
          ) : null}
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
              {/* The ref rides a wrapper so the pile itself keeps the exact prop
                  shape opponentSleeves.test.ts pins for sleeve privacy. */}
              <div
                ref={(el) => {
                  oppDeckRef.current = el;
                }}
              >
                <Pile
                  compact={compactPiles}
                  count={opp.deckCount}
                  label={t("game.pile.deck")}
                  useSelectedSleeve={false}
                />
              </div>
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
              className={`game-security-pile${securityHitSeat === viewerSeat ? " game-security-shield--hit" : ""}`}
              compact={compactPiles}
              count={you.securityCount}
              shield="you"
              armed={securityBreak?.seat === viewerSeat && securityBreak.phase === "arm"}
              breaking={securityBreak?.seat === viewerSeat && securityBreak.phase === "break"}
              label={t("game.yourSecurityPile")}
              refEl={(el) => {
                yourSecRef.current = el;
              }}
              onClick={you.securityCount ? () => setSecurityView("you") : undefined}
            />
          </aside>

          {/* center: opp battle | memory gauge | your battle */}
          <section
            className="game-battle-zones"
            style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
          >
            <div
              className="game-battle-row game-battle-row--opp"
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
              {opp.battleArea.map((p, index) => {
                // A drag is always a normal declaration; only the tap path can be in ＜Vortex＞ mode.
                const isCand =
                  attackTargetIdsOf(attackerPerm, vortexMode).includes(p.permanentId) ||
                  attackTargetIdsOf(draggedAttackerPerm, false).includes(p.permanentId);
                return (
                  <PermanentView
                    key={p.permanentId}
                    perm={p}
                    compact={narrowGameLayout || shortBoard}
                    width={landscapePhone ? LANDSCAPE_PHONE_PERMANENT_WIDTH : undefined}
                    refCb={(el) => {
                      permRefs.current[p.permanentId] = el;
                    }}
                    drop={{
                      "data-drop": "perm-opp",
                      "data-id": p.permanentId,
                      ...dropIntentAttrs("perm-opp", p.permanentId),
                    }}
                    candidate={isCand}
                    highlight={decisionHighlightPermanentId === p.permanentId}
                    burst={permanentBursts.get(p.permanentId)}
                    pending={pendingPermanentIds.has(p.permanentId)}
                    fate={fateBadges.get(p.permanentId)}
                    shake={combatImpactIds.has(p.permanentId)}
                    claw={combatImpactIds.has(p.permanentId)}
                    dpPulse={dpPulses.get(p.permanentId)}
                    lunge={attackLunge?.permanentId === p.permanentId ? attackLunge.direction : undefined}
                    suspendDelayMs={unsuspendStagger(otherSeat(viewerSeat), index)}
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
            <div className="game-memory-band" style={{ flexShrink: 0, position: "relative" }}>
              <MemoryGauge
                value={memory}
                compact={compactPiles}
                phaseLabel={t(`game.phase.${state.phase}` as const)}
                phaseSweeping={unsuspendSweep !== null}
                prediction={memoryPrediction}
              />
              <TurnControl
                state={turnControlState({ phase: state.phase, turnSeat: state.turnSeat, viewerSeat })}
                onEndPhase={() => room && intents.endPhase(room)}
              />
            </div>
            <div
              data-drop="battle-you"
              {...dropIntentAttrs("battle-you")}
              className="game-battle-row game-battle-row--you"
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
              {you.battleArea.map((p, index) => {
                const isBase =
                  (handIsDigi && eligibleBase(p)) ||
                  (dragIsPlay && digivolveTargetsOf(drag?.instanceId).includes(p.permanentId));
                const draggable = canAttackWith(p);
                return (
                  <PermanentView
                    key={p.permanentId}
                    perm={p}
                    compact={narrowGameLayout || shortBoard}
                    width={landscapePhone ? LANDSCAPE_PHONE_PERMANENT_WIDTH : undefined}
                    refCb={(el) => {
                      permRefs.current[p.permanentId] = el;
                    }}
                    candidate={isBase}
                    // A board-mode optional prompt points at the permanent whose
                    // effect is asking, so the rail and the field read as one.
                    highlight={selPerm === p.permanentId || decisionHighlightPermanentId === p.permanentId}
                    burst={permanentBursts.get(p.permanentId)}
                    pending={pendingPermanentIds.has(p.permanentId)}
                    fate={fateBadges.get(p.permanentId)}
                    shake={combatImpactIds.has(p.permanentId)}
                    claw={combatImpactIds.has(p.permanentId)}
                    dpPulse={dpPulses.get(p.permanentId)}
                    lunge={attackLunge?.permanentId === p.permanentId ? attackLunge.direction : undefined}
                    suspendDelayMs={unsuspendStagger(viewerSeat, index)}
                    drop={{
                      "data-drop": "perm-you",
                      "data-id": p.permanentId,
                      ...dropIntentAttrs("perm-you", p.permanentId),
                    }}
                    onClick={draggable ? undefined : onYourPerm(p)}
                    onPointerDown={draggable ? (e) => startPermDrag(p, e) : undefined}
                    // Drag-only permanents still need a pointer-free path: Enter or
                    // Space selects them like a tap would.
                    onKeyboardActivate={draggable ? onYourPerm(p) : undefined}
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
                burst={opp.breeding ? permanentBursts.get(opp.breeding.permanentId) : undefined}
                width={compactPiles ? 42 : narrowRail ? NARROW_RAIL_SLOT_WIDTH : undefined}
                onClick={
                  narrowGameLayout && opp.breeding ? () => showCardMenu(opp.breeding!.permanentId, "opp") : undefined
                }
              />
              <Pile
                className={`game-security-pile${securityHitSeat === otherSeat(viewerSeat) ? " game-security-shield--hit" : ""}`}
                compact={compactPiles}
                count={opp.securityCount}
                shield="opp"
                armed={securityBreak?.seat === otherSeat(viewerSeat) && securityBreak.phase === "arm"}
                breaking={securityBreak?.seat === otherSeat(viewerSeat) && securityBreak.phase === "break"}
                label={t("game.opponentSecurity")}
                useSelectedSleeve={false}
                refEl={(el) => {
                  oppSecRef.current = el;
                }}
                drop={{ "data-drop": "opp-security", ...dropIntentAttrs("opp-security") }}
                glow={canAttackSecurity || canAttackPlayerWith(draggedAttackerPerm, false)}
                onClick={
                  selPerm && canAttackSecurity
                    ? () => attack(selPerm, { kind: "player" }, vortexMode)
                    : opp.securityCount
                      ? () => setSecurityView("opp")
                      : undefined
                }
              />
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <Pile
                compact={compactPiles}
                count={you.deckCount}
                label={t("game.pile.deck")}
                refEl={(el) => {
                  yourDeckRef.current = el;
                }}
              />
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
                burst={you.breeding ? permanentBursts.get(you.breeding.permanentId) : undefined}
                // On a phone the dock is a row above the hand; a smaller slot gives
                // its height back to the battle rows while staying a 44px+ target.
                width={narrowGameLayout ? 46 : undefined}
                candidate={
                  !!you.breeding &&
                  (eligibleBase(you.breeding) ||
                    (dragIsPlay && digivolveTargetsOf(drag?.instanceId).includes(you.breeding.permanentId)))
                }
                focused={breedingWindow}
                drop={{ "data-drop": "breeding-you", ...dropIntentAttrs("breeding-you") }}
                onClick={you.breeding ? onYourPerm(you.breeding) : onBreeding}
              />
            </div>
          </div>

          {/* action bar + hand */}
          <div
            className="game-hand-dock"
            ref={yourHandDockRef}
            style={{ flex: 1, minWidth: 0, padding: "8px 20px 12px" }}
          >
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
              minExposure={compactPiles ? HAND_MIN_EXPOSURE_TOUCH : undefined}
              cards={handEntries}
              selectedInstanceId={handSel ?? undefined}
              selection={
                answerOnBoard && viewerDecision?.kind === "selectCards"
                  ? {
                      selectableInstanceIds: viewerDecision.options?.candidateInstanceIds ?? [],
                      pickedInstanceIds: picks,
                      onToggle: toggleDecisionPick,
                    }
                  : undefined
              }
              startDrag={startHandDrag}
              selectCard={(index) => {
                const entry = handEntries[index];
                if (entry) selectHandCard(entry);
              }}
              draggingInstanceId={dragIsPlay && drag?.kind === "play" ? drag.instanceId : undefined}
              shakeInstanceId={shakeHandInstanceId}
              onHoverChange={setHoveredHandInstanceId}
            />
          </div>
        </footer>

        {arrow ? <AttackArrow from={arrow.from} to={arrow.to} /> : null}

        {deleteBursts.map((burst) => (
          <span
            key={burst.key}
            aria-hidden="true"
            className="game-delete-burst"
            style={{ left: burst.x, top: burst.y }}
          >
            <CardBurst variant="delete" />
          </span>
        ))}

        {drawBursts.map((burst) => (
          <span key={burst.key} aria-hidden="true" className="game-draw-burst" style={{ left: burst.x, top: burst.y }}>
            <CardBurst variant="draw" />
          </span>
        ))}

        {drawFlights.map((flight) => (
          <div
            key={flight.key}
            aria-hidden="true"
            className="game-draw-flight"
            style={
              {
                left: flight.x,
                top: flight.y,
                "--battle-flight-dx": `${flight.dx}px`,
                "--battle-flight-dy": `${flight.dy}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Desktop plays without the sidebar — its controls moved to the header
          cluster and the end-turn orb; the log opens from the header/action feed.
          The narrow layout keeps it: there it collapses into the touch strip. */}
      {narrowGameLayout ? (
        <Sidebar
          phase={state.phase}
          turnCount={state.turnCount}
          memory={memory}
          isMyTurn={isMyTurn}
          canMove={canMoveFromBreeding(you.breeding)}
          hasBreeding={!!you.breeding}
          canHatch={you.eggDeckCount > 0 && !you.breeding}
          narrow
          log={log}
          onHatchOrMove={onBreeding}
          onSurrender={() => room && intents.surrender(room)}
          onReportBug={() => setBugReportOpen(true)}
        />
      ) : null}

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

      {/* The name of the intent the hovered area would send, floated clear of the
          ghost and of the finger holding it. */}
      {dragCardId && hoveredDragIntent
        ? createPortal(
            <span
              className="game-drag-intent"
              data-intent={hoveredDragIntent}
              style={{ left: drag!.x, top: drag!.y - dragIntentLabelOffsetPx(coarsePointer) }}
            >
              {t(dragIntentLabelKey(hoveredDragIntent))}
            </span>,
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
        <span className="game-name-plate" style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ds-foreground)" }}>
          {youName}
        </span>
        <span style={{ fontFamily: "var(--ds-font-mono)", fontSize: 11.5, color: "var(--ds-foreground-muted)" }}>
          {t("game.handLabel", { count: handCount })}
        </span>
      </div>
      <span style={{ fontSize: 12.5, color: "var(--ds-foreground-muted)" }}>{t("game.dragHint")}</span>
    </div>
  );
}

/** Exported for its own test; the match screen is the only place that renders it. */
export function Sidebar({
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
  onSurrender,
  onReportBug,
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
  onSurrender: () => void;
  onReportBug: () => void;
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
        {/* On a phone the action row is a bare button bar with no heading, so a
            disabled button reads as an available one. Drop it instead. Ending the
            phase lives on the memory band's circular orb, like the reference client. */}
        {narrow && !canBreed ? null : (
          <Button size="sm" variant="secondary" full icon={Icons.Dices} onClick={onHatchOrMove} disabled={!canBreed}>
            {hasBreeding ? (canMove ? t("game.moveToBattle") : t("game.raising")) : t("game.hatchEgg")}
          </Button>
        )}
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

      {/* Touch layout: both controls sit in the match header instead. */}
      {narrow ? null : (
        <div
          className="game-sidebar__footer"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "12px 16px",
            borderTop: "1px solid var(--ds-border)",
            background: "var(--ds-surface-muted)",
          }}
        >
          {/* The board fills the viewport, so the report button the rest of the client shows in the
              top bar would sit on top of the play area. This is its in-match home. */}
          <Button size="sm" variant="ghost" full icon={Icons.Bug} onClick={onReportBug}>
            {t("bugReport.button")}
          </Button>
          <Button size="sm" variant="ghost" full icon={Icons.LogOut} onClick={onSurrender}>
            {t("game.surrender")}
          </Button>
        </div>
      )}
    </aside>
  );
}
