/* The in-game board — the design's letterboxed board layout, driven entirely by
   the synchronized GameState and wired to the server through typed intents. The
   client owns zero rules: every action is an intent the server validates, and the
   board is a pure render of what the server sends back (ARCHITECTURE.md §4). */

import { DragKind } from "./screen/enums";
import { LANDSCAPE_PHONE_PERMANENT_WIDTH } from "./screen/queries";
import { useArenaLayout } from "./screen/hooks/useArenaLayout";
import { combatWindowsFor } from "./screen/model/combatWindows";
import { decisionViewFor } from "./screen/model/decisionView";
import { useBoardMeasurements } from "./screen/hooks/useBoardMeasurements";
import { useAttackPreviewArrow } from "./screen/hooks/useAttackPreviewArrow";
import { useBoardSelection } from "./screen/hooks/useBoardSelection";
import { useOverlayState } from "./screen/hooks/useOverlayState";
import { useDragPlumbing } from "./screen/hooks/useDragPlumbing";
import { useTrackingArrow } from "./screen/hooks/useTrackingArrow";
import { boardActions } from "./screen/boardActions";
import { matchIntents } from "./screen/matchIntents";
import { PendingMatchBoard } from "./screen/layout/PendingMatchBoard";
import { pendingMatchNotice } from "./screen/model/pendingMatchNotice";
import { AttackArrowLayer } from "./screen/layout/AttackArrowLayer";
import { BattleZones } from "./screen/layout/BattleZones";
import { BoardBurstLayer } from "./screen/layout/BoardBurstLayer";
import { BreedingDock } from "./screen/layout/BreedingDock";
import { CombatWindowPrompts } from "./screen/layout/CombatWindowPrompts";
import { DecisionPrompts } from "./screen/layout/DecisionPrompts";
import { FieldCardMenu } from "./screen/layout/FieldCardMenu";
import { MatchStatusOverlays } from "./screen/layout/MatchStatusOverlays";
import { PermanentStackView } from "./screen/layout/PermanentStackView";
import { PileViewers } from "./screen/layout/PileViewers";
import { PlayChoicePrompts } from "./screen/layout/PlayChoicePrompts";
import { SecurityScenes } from "./screen/layout/SecurityScenes";
import { DragGhost } from "./screen/layout/DragGhost";
import { FieldClashGhosts } from "./screen/layout/FieldClashGhosts";
import { LeftPileColumn } from "./screen/layout/LeftPileColumn";
import { LogTicker } from "./screen/layout/LogTicker";
import { MemoryBand } from "./screen/layout/MemoryBand";
import { OpponentBar } from "./screen/layout/OpponentBar";
import { OpponentBattleRow } from "./screen/layout/OpponentBattleRow";
import { PlayerDock } from "./screen/layout/PlayerDock";
import { RightPileColumn } from "./screen/layout/RightPileColumn";
import { TurnBanner } from "./screen/layout/TurnBanner";
import { ViewerBattleRow } from "./screen/layout/ViewerBattleRow";
import { HandCardPreview } from "./screen/layout/HandCardPreview";
import { Sidebar } from "./screen/layout/Sidebar";

export { HandCardPreview } from "./screen/layout/HandCardPreview";
export { Sidebar } from "./screen/layout/Sidebar";
import {
  appFusionHostIdsOf as modelAppFusionHostIdsOf,
  digivolveRoutesOf as modelDigivolveRoutesOf,
  digivolveTargetsOf as modelDigivolveTargetsOf,
  eligibleBase as modelEligibleBase,
  linkTargetsOfPermanent as modelLinkTargetsOfPermanent,
} from "./screen/model/eligibility";
import {
  baseDropIntentAttrs as modelBaseDropIntentAttrs,
  dragIntentAt as modelDragIntentAt,
  dropIntentAttrs as modelDropIntentAttrs,
} from "./screen/model/screenDragIntents";
import { decisionAllowsPick as modelDecisionAllowsPick, nextDecisionPicks } from "./screen/model/decisionPicks";
import {
  previewDropTarget as modelPreviewDropTarget,
  previewEntry as modelPreviewEntry,
} from "./screen/model/memoryPreview";
import {
  gameOverReason as modelGameOverReason,
  gameOverResult as modelGameOverResult,
  viewerTurnOrder as modelViewerTurnOrder,
} from "./screen/model/gameOutcome";
import { actionGuards } from "./screen/model/actionGuards";
import { handEntriesOf } from "./screen/model/handEntries";
import { presentedSeats } from "./screen/model/presentedSeats";
import { spotlightIds as modelSpotlightIds } from "./screen/model/spotlightIds";
import type { DropZoneHit, PermanentChrome } from "./screen/types";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CardKind,
  PRESENTATION_CHANNEL,
  getCardDefinition,
  parseTriggerKey,
  type DecisionResponse,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { rejectionMessage } from "../rejectionMessages";
import { useTranslation } from "../i18n";
import { useRoom, type MatchMode, type UseRoomResult } from "../net/useRoom";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { selectPresentedState, type StateSnapshot } from "../net/presentedState";
import { intents } from "../net/intents";
import { joinWithBot } from "../net/client";
import type { CSSProperties } from "react";
import type { StartMode } from "../screens/Lobby";
import type { AegisJoinOptions } from "../net/types";
import { type Screen } from "../design/primitives";
import type { DigimonWorldAvatarId } from "../account/avatars";
import type { ColorName } from "../design/theme";
import { playSound } from "../design/sound";
import { areActionConfirmationsEnabled } from "../design/actionConfirmation";
import { useBattlefieldStyle } from "../design/battlefield";
import "./game.css";
import "./arena.css";
import { Side } from "./side";
import "./arenaMobile.css";
import { type DropTarget } from "./dragIntents";
import { turnControlState } from "./turnControl";
import {
  bothSeated,
  openCombatWindow,
  mirroredCombatWindow,
  buildInstanceIndex,
  digivolveBasePermanentIds,
  attackTargetIdsOf,
  buildMatchLog,
  canAttackPlayerWith,
  canAttackWith,
  displayMemory,
  appFusionRoutesForHost,
  parseActivatable,
  otherSeat,
  triggerCardId,
  viewerSeatOf,
  type LogLine,
  breedingSlotClickAction,
  canMoveFromBreeding,
  canUseBreedingAction,
} from "./boardModel";
import { MulliganOverlay, playerFacingEffectClause } from "./overlay";
import { AttackAnnouncementBanner } from "./SidePanelStack";
import { NarrationStack } from "./NarrationStack";
import { CardOpenerProvider } from "./cardLinks";
import { useMatchCues } from "./useMatchCues";
import { BATTLE_TIMING_STYLE, TIMINGS } from "./timings";
import { TargetingSpotlight } from "./TargetingSpotlight";
import { pendingFateBadges } from "./pendingFate";
import { shieldSecurityCount } from "./securityClash";
import { predictedMemory } from "./memoryArc";
import { memoryCostPreview } from "./memoryCostPreview";
import { fieldSlots, triggerClauseSummary, triggerSource, type TriggerSource } from "./decisionPresentation";

export function GameScreen({
  joinOptions,
  startMode = "casual",
  roomCode,
  botDeckId,
  betaBattleMode,
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
  /** Famous-deck preset the seated bot should play; absent means the server picks at random. */
  botDeckId?: string;
  betaBattleMode?: boolean;
  onExit: (screen: Screen) => void;
  /** Only shapes what the report dialog says about follow-up questions; reporting needs no account. */
  signedIn?: boolean;
  demoConnection?: Pick<
    UseRoomResult,
    "room" | "status" | "state" | "events" | "decision" | "acknowledgeDecision" | "error" | "sessionId" | "roomCode"
  > & {
    /** Canonical keyword names mapped to printed parameters in the visual demo. */
    keywordLabels?: Readonly<Record<string, Readonly<Record<string, string>>>>;
    respondDecision?: (response: DecisionResponse) => void;
    acknowledgeBlockWindow?: (blockerPermanentId?: string) => void;
    /** A fabricated connection has no server batches; its whole event list is one moment. */
    batches?: readonly ServerBatch[];
    /** No snapshots either, so the board it shows is always its live state. */
    snapshots?: readonly StateSnapshot[];
  };
}) {
  const { t } = useTranslation();
  const actionConfirmationsEnabled = areActionConfirmationsEnabled();
  const {
    narrowGameLayout,
    compactPiles,
    shortBoard,
    portraitArena,
    landscapePhone,
    coarsePointer,
    collapseNotices,
    arenaPileWidth,
    arenaPermanentWidth,
    handCardWidth,
    handMinExposure,
  } = useArenaLayout();
  const matchConfig = useMemo(() => {
    if (startMode === "casual" || startMode === "ranked" || startMode === "beta") return undefined;
    if (startMode === "bot") return { mode: "bot" as MatchMode };
    return { mode: startMode, roomCode };
  }, [startMode, roomCode]);
  const roomOptions = useMemo(
    () => ({
      ...joinOptions,
      ranked: startMode === "ranked",
      betaBattleMode: startMode === "beta" || (startMode === "bot" && betaBattleMode === true),
    }),
    [joinOptions, startMode, betaBattleMode],
  );
  const liveConnection = useRoom(roomOptions, matchConfig, demoConnection !== undefined);
  const {
    room,
    status,
    state,
    events,
    batches,
    decision,
    acknowledgeDecision,
    error,
    sessionId,
    roomCode: hostRoomCode,
    snapshots,
  } = demoConnection ?? liveConnection;
  // A demo or showcase fabricates events with no batch boundary of their own, so its list
  // is presented as the one moment it describes.
  const cueBatches = useMemo(() => batches ?? [singleServerBatch(events)], [batches, events]);
  const viewerSeat = useMemo(() => viewerSeatOf(state, sessionId), [state, sessionId]);

  const vsBot = startMode === "bot";

  const botCalledRef = useRef(false);
  const [botError, setBotError] = useState<string>();
  useEffect(() => {
    if (!vsBot || botCalledRef.current || !room || status !== "connected") return;
    botCalledRef.current = true;
    void joinWithBot(room.roomId, botDeckId).catch((botJoinError: unknown) => {
      console.error("[BOT_JOIN_CLIENT] failed", {
        roomId: room.roomId,
        error: botJoinError instanceof Error ? botJoinError.message : String(botJoinError),
      });
      setBotError(t("game.botConnectionFailedDetail"));
    });
  }, [vsBot, room, status, botDeckId, t]);

  const {
    handSel,
    setHandSel,
    handPreview,
    setHandPreview,
    selPerm,
    setSelPerm,
    linkSel,
    setLinkSel,
    vortexMode,
    setVortexMode,
    clearSel,
  } = useBoardSelection({ state, viewerSeat });
  const {
    cardMenu,
    setCardMenu,
    stackView,
    setStackView,
    trashView,
    setTrashView,
    securityView,
    setSecurityView,
    picks,
    setPicks,
    decisionAsDialog,
    setDecisionAsDialog,
    historyOpen,
    setHistoryOpen,
    zoomCardId,
    setZoomCardId,
    zoomArtId,
    setZoomArtId,
    bugReportOpen,
    setBugReportOpen,
    dualPlay,
    setDualPlay,
    assemblyPick,
    setAssemblyPick,
    evoCostChoice,
    setEvoCostChoice,
    digiXrosPick,
    setDigiXrosPick,
    appFusionChoice,
    setAppFusionChoice,
    actionConfirm,
    setActionConfirm,
  } = useOverlayState({ decision, state, clearSel });
  // A play leaves the hand visually at the same instant the intent is dispatched. The
  // synchronized state will confirm that departure; a rejection rolls it back.
  const [optimisticPlayedInstanceId, setOptimisticPlayedInstanceId] = useState<string>();
  const playAttemptEventSeqRef = useRef(-1);
  /** The combat-prompt window this seat already answered, so a slow round trip or a window the
   * server closed without its own resolved event cannot leave a stale prompt clickable a second
   * time. Cleared when the window is genuinely gone. */
  const answeredCombatWindowKeyRef = useRef<string | undefined>(undefined);
  /** The last combat-answer rejection already rolled back, so one refusal clears the optimistic
   * hide exactly once. */
  const rolledBackRejectionSeqRef = useRef<number | undefined>(undefined);

  const { drag, dragHover, handleTapRef, handleDropRef, startHandDrag, startPermDrag } = useDragPlumbing();

  const battlefield = useBattlefieldStyle();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const permRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Where each permanent last stood, in board coordinates. A deletion is narrated after
  // the board has already dropped the permanent, so the burst needs the last measurement
  // rather than the (gone) element.
  const permCentersRef = useRef<Record<string, { x: number; y: number }>>({});
  // The card that was standing at each position, kept for the same reason: the
  // shatter is drawn from the deleted card's own art, after the board dropped it.
  const permCardIdsRef = useRef<Record<string, string>>({});
  const yourSecRef = useRef<HTMLDivElement | null>(null);
  const oppSecRef = useRef<HTMLDivElement | null>(null);
  const yourDeckRef = useRef<HTMLDivElement | null>(null);
  const oppDeckRef = useRef<HTMLDivElement | null>(null);
  const yourHandDockRef = useRef<HTMLDivElement | null>(null);
  const oppHandStripRef = useRef<HTMLDivElement | null>(null);
  const attackPreviewTargetRef = useRef<{ security: boolean; permanentId?: string }>({ security: false });
  const arrow = useAttackPreviewArrow({
    attackerPermanentId: selPerm,
    state,
    boardRef,
    permanentRefs: permRefs,
    opponentSecurityRef: oppSecRef,
    targetRef: attackPreviewTargetRef,
  });

  // Which hand card the pointer is over, so the memory gauge can trace where a
  // play would put memory before the card is even picked up.
  const [hoveredHandInstanceId, setHoveredHandInstanceId] = useState<string | undefined>(undefined);
  // The hand card a refusal belongs to. The server's `actionRejected` names the
  // intent and the reason, not the card, so the card is the one this client last
  // sent a play for — the only thing that could have been refused.
  const [shakeHandInstanceId, setShakeHandInstanceId] = useState<string | undefined>(undefined);
  const lastPlayAttemptRef = useRef<string | undefined>(undefined);
  // Measured boxes of the permanents a target prompt is offering, for the mask.

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

  // A block/counter/alliance/evade/barrier window is a question for this seat exactly like a
  // `pendingDecision` is, but it answers through its own intent rather than the decision
  // channel — computed here, ahead of `cues`, purely as the barrier's input signal (the actual
  // per-kind payloads used to render the overlays are derived again below). The two can never
  // both be open at once (the server never opens one of these while a decision is unanswered),
  // so folding it into the same `decisionPending`/`decisionStateVersion` inputs below is safe.
  const openCombatWindowForBarrier = state ? openCombatWindow(events, state, viewerSeat) : null;
  // The server's own record of the window still awaiting this seat's answer. Authoritative for
  // whether a prompt may be shown: the opening event can be missed entirely (broadcast while the
  // socket was down) or fall out of the capped live log, and an optimistic local hide can outlive
  // an answer the server refused.
  const mirroredWindow = state ? mirroredCombatWindow(state, viewerSeat) : null;
  const decisionPendingForViewer = decision?.seat === viewerSeat && decision.kind !== "mulligan";

  // Every cue the server provokes: sounds, panels, banners, the security clash,
  // the draw flights. The hook sequences them on the animation queue; this
  // component only renders what it reports.
  const cues = useMatchCues({
    snapshots,
    batches: cueBatches,
    phaseEvents: events,
    state,
    viewerSeat,
    mulliganOpen: decision?.kind === "mulligan",
    // The portrait phone folds both narration corners into one centred slot.
    collapseNarration: collapseNotices,
    // A security check the server stopped to ask the viewer something cannot close until it
    // is answered, so the cue sequence needs to know a question is waiting.
    decisionPending: decisionPendingForViewer || openCombatWindowForBarrier !== null,
    // The barrier catches the presentation up to the board the question was asked about
    // before the prompt opens. An older server sends no revision, and no barrier is raised.
    decisionStateVersion: decisionPendingForViewer
      ? decision.stateVersion
      : (openCombatWindowForBarrier?.stateVersion ?? undefined),
    anchors: {
      board: boardRef,
      permanentCenter: (permanentId) => permCentersRef.current[permanentId],
      permanentCardId: (permanentId) => permCardIdsRef.current[permanentId],
      yourDeck: yourDeckRef,
      oppDeck: oppDeckRef,
      yourHandDock: yourHandDockRef,
      oppHandStrip: oppHandStripRef,
      yourSecurity: yourSecRef,
      oppSecurity: oppSecRef,
    },
    onActionRejected: (reason) => ping(rejectionMessage(reason, t)),
    onPresentationReport: (report) => {
      room?.send(PRESENTATION_CHANNEL, report);
    },
  });
  // The dialog that asks the viewer whether to activate their own effect already names the
  // card and prints its clause, so the matching corner notice would only repeat it.
  const promptedOwnEffectCardId = decision?.seat === viewerSeat ? decision.sourceCardId : undefined;
  const dismissOwnEffectNoticeRef = useRef(cues.dismissOwnEffectNotice);
  dismissOwnEffectNoticeRef.current = cues.dismissOwnEffectNotice;
  useEffect(() => {
    if (promptedOwnEffectCardId === undefined) return;
    dismissOwnEffectNoticeRef.current(promptedOwnEffectCardId);
  }, [promptedOwnEffectCardId]);
  const {
    attackAnnouncement,
    attackLunge,
    combatImpactIds,
    fieldClash,
    deckRiffles,
    effectSources,
    securityFlights,
    securityDealCounts,
    dpPulses,
    freezePulses,
    phaseBanner,
    deleteBursts,
    drawBursts,
    drawFlights,
    pendingPermanentIds,
    permanentBursts,
    optionBranch,
    securityBranch,
    securityBreak,
    securityClash,
    securityHitSeat,
    heldSecurityCounts,
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

  const trackingArrow = useTrackingArrow({
    state,
    events,
    decision,
    picks,
    viewerSeat,
    fieldClash,
    boardRef,
    permRefs,
    permCentersRef,
    viewerSecurityRef: yourSecRef,
    opponentSecurityRef: oppSecRef,
  });

  /* The activation moment for an effect fired from a zone rather than a card on
     the field: the trash pile throws its top card up, the hand raises the Option.
     Which zone the source is in comes from the board (`effectSource.ts`), not from
     the event, which names only the card. */
  const effectSourceSeats = new Map(effectSources.map((activation) => [activation.key, activation]));
  const trashEffectSource = (seat: Seat): string | undefined =>
    [...effectSourceSeats.values()].some((activation) => activation.seat === seat && activation.site.zone === "trash")
      ? "game-pile--effect-source"
      : undefined;
  const handEffectSourceInstanceId = effectSources.find(
    (activation) => activation.seat === viewerSeat && activation.site.zone === "hand",
  )?.site;
  const effectSourcePermanentIds = new Set(
    effectSources.flatMap((activation) => (activation.site.zone === "field" ? [activation.site.permanentId] : [])),
  );

  const you = state?.players[viewerSeat];
  const opp = state?.players[otherSeat(viewerSeat)];

  useEffect(() => {
    if (!optimisticPlayedInstanceId) return;
    const stillInHand = you?.hand.some((card) => card.instanceId === optimisticPlayedInstanceId) ?? false;
    if (!stillInHand) {
      setOptimisticPlayedInstanceId(undefined);
      return;
    }
    const rejected = events.some(
      (event, index) =>
        event.kind === "actionRejected" &&
        event.intent === "playCard" &&
        (event.seq ?? index) > playAttemptEventSeqRef.current,
    );
    if (rejected) setOptimisticPlayedInstanceId(undefined);
  }, [events, optimisticPlayedInstanceId, you]);

  const { spotlightRequestRef, spotlightSubjects, boardSize } = useBoardMeasurements({
    viewer: you,
    opponent: opp,
    boardRef,
    fieldRef,
    permRefs,
    permCentersRef,
    permCardIdsRef,
    opponentSecurityRef: oppSecRef,
  });

  // ----- pre-match / connection gates -----
  if (status === "reconnecting" || status === "error" || botError || !state || !you || !opp || !bothSeated(state)) {
    const notice = pendingMatchNotice({ status, botError, error, vsBot, startMode, hostRoomCode, joinOptions, t });
    return (
      <PendingMatchBoard
        title={notice.title}
        detail={notice.detail}
        spinner={notice.spinner}
        actionLabel={notice.actionLabel}
        roomCode={notice.roomCode}
        onAction={notice.exitTo ? () => onExit(notice.exitTo!) : undefined}
      />
    );
  }

  /**
   * The two boards this screen reads (docs/presentation-queue-plan.md 3.2).
   *
   * `state` is the live synchronized state and is the ONLY thing legality is read off:
   * what may be played, what may be attacked, which decision is open. `shownState` is the
   * board the presentation has reached — the snapshot at the revision of the batch the
   * queue is narrating — and drives the field, piles and gauge. Hands follow confirmed
   * server changes independently of narration, except during the turn-start draw hold.
   * They are the same object whenever the queue is caught up.
   */
  const shownState =
    selectPresentedState({
      live: state,
      snapshots: snapshots ?? [],
      presentedStateVersion: cues.presentedStateVersion,
    }) ?? state;

  const {
    shownViewer: shownYou,
    shownOpponent: shownOpp,
    breedingViewer: breedingYou,
    breedingOpponent: breedingOpp,
    shownHand,
    shownHandCount,
    shownOpponentHandCount,
    handHeld,
  } = presentedSeats({
    shownState,
    viewer: you,
    opponent: opp,
    viewerSeat,
    heldPhaseState: cues.heldPhaseState,
    heldDrawState: cues.heldDrawState,
    heldBreedingState: cues.heldBreedingState,
    optimisticPlayedInstanceId,
  });
  // What the ribbons have announced, for the readouts only: the live turn is what every
  // guard below reads, and what `isMyTurn` must keep meaning.
  const displayedTurnSeat = cues.displayedTurn?.seat ?? shownState.turnSeat;
  const displayedTurnCount = cues.displayedTurn?.count ?? shownState.turnCount;
  const {
    isMyTurn,
    mainActionBlocked,
    endPhaseBlocked,
    breedingWindow,
    canHatchEgg,
    canMoveOutOfBreeding,
    breedingActionsOpen,
  } = actionGuards({
    state,
    viewer: you,
    viewerSeat,
    decisionOpen: Boolean(decision || state.pendingDecision),
    presenting: cues.presenting,
    phasePresentationPending: cues.phaseTransitionPending || turnTransition !== null || phaseBanner !== null,
  });
  // The gauge is part of the scene, so it moves when the moment that moved it is narrated.
  const memory = displayMemory(shownState, viewerSeat);
  const instanceIndex = buildInstanceIndex(state, viewerSeat);

  const { handEntries, shownHandEntries } = handEntriesOf({
    viewer: you,
    shownHand,
    handHeld,
    optimisticPlayedInstanceId,
  });
  const digivolveRoutesOf = (instanceId: string) => modelDigivolveRoutesOf({ handEntries, instanceId });
  const selEntry = handSel ? handEntries.find((h) => h.instanceId === handSel) : undefined;
  const selCardId = selEntry?.cardId;
  const selDef = selCardId ? getCardDefinition(selCardId) : undefined;
  const handPreviewEntry = handPreview ? shownHandEntries.find((entry) => entry.instanceId === handPreview) : undefined;
  const handPreviewActions =
    handPreview && !decision ? handEntries.find((entry) => entry.instanceId === handPreview) : undefined;

  const selection = { clearSel, setHandSel, setHandPreview, setSelPerm, setVortexMode, setLinkSel };
  const overlayControls = {
    setCardMenu,
    setStackView,
    setPicks,
    setDualPlay,
    setActionConfirm,
    setAssemblyPick,
    setDigiXrosPick,
    setEvoCostChoice,
  };
  const {
    dispatchPlayCard,
    playCard,
    beginLink,
    linkCard,
    attack,
    respondDecision,
    respondMulligan,
    activateEffect,
    digivolveWithChoice,
  } = matchIntents({
    room,
    localConnection: demoConnection,
    decision,
    acknowledgeDecision,
    events,
    viewer: you,
    opponent: opp,
    handEntries,
    digivolveRoutesOf,
    mainActionBlocked,
    actionConfirmationsEnabled,
    playGameCue,
    lastPlayAttemptRef,
    playAttemptEventSeqRef,
    setOptimisticPlayedInstanceId,
    selection,
    overlays: overlayControls,
  });

  const { blockWindow, counterWindow, allianceWindow, evadeWindow, barrierWindow, markCombatWindowAnswered } =
    combatWindowsFor({
      events,
      state,
      viewerSeat,
      isMyTurn,
      mirroredWindow,
      openCombatWindow: openCombatWindowForBarrier,
      answeredCombatWindowKeyRef,
      rolledBackRejectionSeqRef,
    });

  // ----- eligibility helpers -----
  // Every "can I do this?" answer below is the server's, read off the state it already
  // projects (CardInstance.digivolveTargetPermanentIds / Permanent.attackablePermanentIds).
  // The client renders affordances; it does not re-derive the rules behind them.
  const handIsDigi = selDef?.kinds.includes(CardKind.Digimon) ?? false;

  const digivolveTargetsOf = (instanceId: string | undefined) => modelDigivolveTargetsOf({ handEntries, instanceId });

  const linkTargetsOfPermanent = (perm: Permanent) => modelLinkTargetsOfPermanent({ isMyTurn, perm });

  const appFusionHostIdsOf = (instanceId: string | undefined) =>
    modelAppFusionHostIdsOf({ handEntries, you, instanceId });

  const eligibleBase = (perm: Permanent) => modelEligibleBase({ handEntries, you, handSel, perm });
  const dragCardId = drag && drag.started ? drag.cardId : undefined;
  const dragIsPlay = drag?.kind === DragKind.Play && drag.started;

  const dragIntentAt = (hit: DropZoneHit | null) => modelDragIntentAt({ hit, drag, you, handEntries });

  const dropIntentAttrs = (target: DropTarget, id?: string) =>
    modelDropIntentAttrs({ target, id, drag, you, handEntries });

  const hoveredDragIntent = dragIntentAt(dragHover);

  // The bases in the battle area the card in the air would digivolve onto. Releasing it on
  // any other permanent plays it, which the battle row underneath already offers, so only
  // these permanents mark themselves — a Tamer never among them.
  const dragBasePermanentIds = new Set(
    dragIsPlay && drag
      ? [
          ...digivolveBasePermanentIds(drag.cardId, you.battleArea, digivolveTargetsOf(drag.instanceId)),
          ...appFusionHostIdsOf(drag.instanceId),
        ]
      : [],
  );

  const baseDropIntentAttrs = (permanentId: string) =>
    modelBaseDropIntentAttrs({ permanentId, dragBasePermanentIds, drag, you, handEntries });
  /** An App Fusion is an ordinary Main-phase action, so it follows the same guard. */
  const appFusionActionAvailable = () => !mainActionBlocked;
  const {
    findPermanent,
    findPresentedPermanent,
    showCardMenu,
    beginAttack,
    stackCardsOf,
    selectHandCard,
    handleTap,
    handleDrop,
    onYourPerm,
    onOppPerm,
    onBreeding,
  } = boardActions({
    state,
    shownState,
    viewer: you,
    room,
    t,
    handEntries,
    handSel,
    selPerm,
    selCardId,
    linkSel,
    vortexMode,
    isMyTurn,
    mainActionBlocked,
    breedingActionsOpen,
    permanentRefs: permRefs,
    ping,
    playGameCue,
    selection,
    overlays: overlayControls,
    setAppFusionChoice,
    playCard,
    attack,
    linkCard,
    digivolveWithChoice,
    digivolveTargetsOf,
    appFusionHostIdsOf,
    eligibleBase,
    linkTargetsOfPermanent,
  });
  handleTapRef.current = handleTap;
  handleDropRef.current = handleDrop;

  // ----- log + game over -----
  const log: LogLine[] = buildMatchLog(events, viewerSeat, instanceIndex, t);

  const gameOverReason = modelGameOverReason({ events });

  const gameOverResult: "win" | "loss" | "draw" = modelGameOverResult({
    events,
    viewerSeat,
    winnerSeat: state.winnerSeat,
  });

  const viewerTurnOrder = modelViewerTurnOrder({ events, viewerSeat });

  const attackerPerm = selPerm ? you.battleArea.find((p) => p.permanentId === selPerm) : undefined;
  const draggedAttackerPerm =
    drag?.kind === DragKind.Attack ? you.battleArea.find((p) => p.permanentId === drag.permanentId) : undefined;
  const canAttackSecurity = canAttackPlayerWith(attackerPerm, vortexMode);
  attackPreviewTargetRef.current = {
    security: canAttackSecurity,
    permanentId: canAttackSecurity ? undefined : attackTargetIdsOf(attackerPerm, vortexMode)[0],
  };

  const allPermanents = [...you.battleArea, ...opp.battleArea];
  const handInstanceIds = handEntries.map((entry) => entry.instanceId);
  const {
    viewerDecision,
    answerOnBoard,
    decisionSourceCardId,
    decisionHighlightPermanentId,
    decisionSelectable,
    decisionVisible,
    decisionVisibleCardIds,
    decisionInstanceColors,
    decisionDifferentColors,
    decisionDistinctCardIds,
    decisionMin,
    decisionMax,
  } = decisionViewFor({
    decision,
    decisionAnimationsPending: cues.decisionAnimationsPending,
    decisionAsDialog,
    viewerSeat,
    events,
    state,
    instanceIndex,
    permanents: allPermanents,
    handInstanceIds,
  });

  // CR 4-24-2: a multicolor card only needs one color no other pick uses, so the
  // picks stay legal as long as a distinct color can still be assigned to each.
  const decisionAllowsPick = (instanceId: string) =>
    modelDecisionAllowsPick({
      decisionSelectable,
      instanceId,
      picks,
      decisionInstanceColors,
      decisionDifferentColors,
      decisionVisibleCardIds,
      decisionDistinctCardIds,
    });

  const toggleDecisionPick = (instanceId: string) => {
    if (!decisionAllowsPick(instanceId)) return;
    setPicks((current) => nextDecisionPicks({ picks: current, instanceId, max: decisionMax }));
  };
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

  const spotlightIds = modelSpotlightIds({
    breedingWindow,
    linkSel,
    selPerm,
    attackerPerm,
    vortexMode,
    handSel,
    handIsDigi,
    you,
    handEntries,
  });
  const spotlightAttacker = !breedingWindow ? (selPerm ?? undefined) : undefined;
  const spotlightSecurity = !!spotlightAttacker && canAttackSecurity;
  spotlightRequestRef.current = {
    ids: spotlightIds,
    attacker: spotlightAttacker,
    security: spotlightSecurity,
  };
  const spotlightOpen = spotlightIds.length > 0 || !!spotlightAttacker;

  // Where memory would land if the action the pointer is offering were taken. Which
  // action that is changes with the pointer: a hovered or selected hand card prices its
  // play, a drag over a base prices the digivolution onto that base, and a drag over an
  // area that would refuse the drop prices nothing. The costs are the server's own
  // (`projectedPlayCost`, and the paths `getDigivolveCostOptions` reads off the routes
  // the server offered); the printed figure is only the fallback for a card it did not
  // project. Still a dashed prediction that gates nothing: a [BeforePayCost] reducer can
  // lower it again at pay time, which the server cannot resolve without prompting.

  const previewEntry = modelPreviewEntry({
    dragIsPlay,
    drag,
    hoveredHandInstanceId,
    handSel,
    handEntries,
  });
  const previewPlayCost = (() => {
    if (!previewEntry) return undefined;
    if (previewEntry.projectedPlayCost >= 0) return previewEntry.projectedPlayCost;
    const printed = getCardDefinition(previewEntry.cardId)?.playCost;
    return printed !== undefined && printed >= 0 ? printed : undefined;
  })();

  const previewDropTarget = modelPreviewDropTarget({
    dragIsPlay,
    drag,
    dragHover,
    hoveredDragIntent,
    you,
    opp,
    handEntries,
  });
  const memoryCostCandidate = memoryCostPreview({
    heldCard: previewEntry
      ? { playable: previewEntry.playableFromHand === true, playCost: previewPlayCost }
      : undefined,
    dropTarget: previewDropTarget,
  });
  const memoryPrediction = memoryCostCandidate ? predictedMemory(memory, memoryCostCandidate.cost) : undefined;

  const triggerDetails =
    viewerDecision?.kind === "orderTriggers"
      ? (viewerDecision.options?.triggerKeys ?? []).map((key, index) => {
          // Positions count inside the owner's own battle area: numbering across both
          // players' fields printed "Field: 3" for the first Digimon a player had out.
          const instanceId = parseTriggerKey(key).instanceId;
          const source = ((): TriggerSource => {
            const mine = triggerSource(instanceId, { fieldSlots: fieldSlots(you.battleArea), handInstanceIds });
            if (mine.zone !== "unknown") return mine;
            return triggerSource(instanceId, { fieldSlots: fieldSlots(opp.battleArea), handInstanceIds });
          })();
          const cardId = viewerDecision.options?.triggerCardIds?.[index] ?? triggerCardId(key);
          const clause =
            playerFacingEffectClause({
              cardId,
              // Per-trigger truth: one permanent can queue an [On Play] and a [When
              // Digivolving] at once, and each row must read its own clause.
              timing: viewerDecision.options?.triggerTimings?.[index] || viewerDecision.options?.timing,
              description: viewerDecision.options?.triggerDescriptions?.[index],
              isInherited: viewerDecision.options?.triggerIsInherited?.[index] === true,
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
  // The overlay stays mounted when its routes go stale so the player sees why the
  // action disappeared; an empty route list disables confirmation.
  const appFusionLive = appFusionChoice
    ? (() => {
        const entry = handEntries.find((candidate) => candidate.instanceId === appFusionChoice.handInstanceId);
        const host = you.battleArea.find((candidate) => candidate.permanentId === appFusionChoice.hostPermanentId);
        const usable = entry !== undefined && host !== undefined && appFusionActionAvailable();
        return {
          entry,
          host,
          routes: usable ? appFusionRoutesForHost(entry.appFusionRoutes ?? [], host) : [],
          normalEvolutionLegal: usable && entry.digivolveTargetPermanentIds.includes(host.permanentId),
        };
      })()
    : undefined;
  const cardMenuPermanent = cardMenu ? findPermanent(cardMenu.permanentId) : undefined;
  const stackViewPermanent = stackView ? findPermanent(stackView) : undefined;
  const stageEl = typeof document !== "undefined" ? document.getElementById("aegis-stage") : null;
  // One physical raising area moves into the utility row on a portrait screen.
  const yourBreedingDock = (
    <BreedingDock
      eggDeckCount={breedingYou.eggDeckCount}
      breeding={breedingYou.breeding}
      keywordLabels={
        breedingYou.breeding ? demoConnection?.keywordLabels?.[breedingYou.breeding.permanentId] : undefined
      }
      pileWidth={arenaPileWidth}
      compactPiles={compactPiles}
      burst={breedingYou.breeding ? permanentBursts.get(breedingYou.breeding.permanentId) : undefined}
      eggDeckRiffling={deckRiffles.has(`${viewerSeat}:eggDeck`)}
      actionsOpen={breedingActionsOpen}
      canHatchEgg={canHatchEgg}
      canMoveOut={canMoveOutOfBreeding}
      slotCandidate={
        (breedingActionsOpen && canMoveOutOfBreeding) ||
        (!!breedingYou.breeding &&
          (eligibleBase(breedingYou.breeding) ||
            (dragIsPlay && digivolveTargetsOf(drag?.instanceId).includes(breedingYou.breeding.permanentId))))
      }
      slotDrop={{ "data-drop": "breeding-you", ...dropIntentAttrs("breeding-you") }}
      onHatch={onBreeding}
      // In the breeding step an occupied slot answers with the move itself;
      // otherwise it reads like any other own card and opens the detail menu.
      // An empty slot only answers the breeding step, once its actions open.
      onSlotClick={
        you.breeding
          ? breedingSlotClickAction({
              breedingActionsOpen,
              canMove: canMoveOutOfBreeding,
              hasPendingSelection: !!handSel || !!linkSel || selPerm === you.breeding.permanentId,
            }) === "move"
            ? onBreeding
            : onYourPerm(you.breeding)
          : breedingActionsOpen
            ? onBreeding
            : undefined
      }
    />
  );
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
          arenaInspection={{
            side: Side.Viewer,
            container: boardRef.current,
            returnFocusTo:
              yourHandDockRef.current?.querySelectorAll<HTMLElement>(".game-hand-card")[
                shownHandEntries.findIndex((entry) => entry.instanceId === handPreviewEntry.instanceId)
              ],
          }}
          cardId={handPreviewEntry.cardId}
          artId={handPreviewEntry.artId}
          activatableEffects={parseActivatable(handPreviewActions?.activatableEffectsJson ?? "")}
          canPlay={handPreviewActions?.playableFromHand === true}
          canDigivolve={
            (handPreviewActions?.digivolveTargetPermanentIds.length ?? 0) > 0 ||
            (!!handPreviewActions && appFusionHostIdsOf(handPreviewActions.instanceId).length > 0)
          }
          canLink={(handPreviewActions?.linkTargetPermanentIds.length ?? 0) > 0}
          onPlay={() => {
            if (handSel) playCard(handSel);
            setHandPreview(null);
          }}
          onLink={() =>
            handPreviewActions &&
            beginLink(
              handPreviewActions.instanceId,
              handPreviewActions.cardId,
              handPreviewActions.linkTargetPermanentIds,
            )
          }
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

      <DecisionPrompts
        decision={viewerDecision}
        answerOnBoard={answerOnBoard}
        permanents={allPermanents}
        sourceCardId={decisionSourceCardId}
        candidates={decisionVisible}
        allowsPick={decisionAllowsPick}
        picks={picks}
        min={decisionMin}
        max={decisionMax}
        triggerDetails={triggerDetails}
        opponentSelecting={
          Boolean(state.pendingDecision) &&
          state.pendingDecision?.seat !== viewerSeat &&
          !state.gameOver &&
          !cues.zoneShowcase
        }
        onTogglePick={toggleDecisionPick}
        onRespond={respondDecision}
        onOpenDialog={() => setDecisionAsDialog(true)}
      />

      <CombatWindowPrompts
        state={state}
        blockWindow={blockWindow}
        counterWindow={counterWindow}
        allianceWindow={allianceWindow}
        evadeWindow={evadeWindow}
        barrierWindow={barrierWindow}
        onBlock={(blockerPermanentId) => {
          markCombatWindowAnswered();
          if (room) {
            if (blockerPermanentId) intents.declareBlock(room, blockerPermanentId);
            else intents.declineBlock(room);
          } else demoConnection?.acknowledgeBlockWindow?.(blockerPermanentId);
        }}
        onCounter={(instanceId, effectKey) => {
          markCombatWindowAnswered();
          if (room) intents.respondCounter(room, instanceId, effectKey);
        }}
        onAlliance={(allyPermanentId) => {
          markCombatWindowAnswered();
          if (room) intents.respondAlliance(room, allyPermanentId);
        }}
        onEvade={(permanentId, accept) => {
          markCombatWindowAnswered();
          if (room) intents.respondEvade(room, permanentId, accept);
        }}
        onBarrier={(permanentId, accept) => {
          markCombatWindowAnswered();
          if (room) intents.respondBarrier(room, permanentId, accept);
        }}
      />

      {!state.gameOver ? (
        <SecurityScenes
          securityBreak={securityBreak}
          securityClash={securityClash}
          securityBranch={securityBranch}
          optionBranch={optionBranch}
          zoneShowcase={zoneShowcase}
          compact={collapseNotices}
        />
      ) : null}

      <MatchStatusOverlays
        log={log}
        historyOpen={historyOpen}
        zoomCardId={zoomCardId}
        zoomArtId={zoomArtId}
        bugReportOpen={bugReportOpen}
        matchLogId={state.matchLogId}
        signedIn={signedIn}
        opponentDropped={!vsBot && !opp.connected && !state.gameOver}
        gameOver={
          state.gameOver
            ? {
                result: gameOverResult,
                reason: gameOverReason,
                stats: [
                  { value: state.turnCount, label: t("game.stats.turns") },
                  { value: opp.battleArea.length, label: t("game.stats.oppBoard") },
                  { value: you.securityCount, label: t("game.stats.yourSecurity") },
                ],
              }
            : undefined
        }
        onCloseHistory={() => setHistoryOpen(false)}
        onOpenCard={setZoomCardId}
        onCloseZoom={() => setZoomCardId(null)}
        onCloseBugReport={() => setBugReportOpen(false)}
        onMenu={() => onExit("home")}
        onRematch={() => onExit("lobby")}
      />

      <PlayChoicePrompts
        dualPlay={dualPlay}
        actionConfirm={actionConfirm}
        appFusion={
          appFusionChoice && appFusionLive
            ? {
                resultCardId: appFusionLive.entry?.cardId ?? "",
                hostCardId: appFusionLive.host?.topCard?.cardId ?? "",
                routes: appFusionLive.routes,
                canEvolveNormally: appFusionLive.normalEvolutionLegal,
              }
            : null
        }
        evoCostChoice={evoCostChoice}
        assemblyPick={assemblyPick}
        digiXrosPick={digiXrosPick}
        onDualPlay={(useAs) => {
          if (!dualPlay || mainActionBlocked || !room) return;
          if (!handEntries.some((entry) => entry.instanceId === dualPlay.instanceId)) {
            setDualPlay(null);
            clearSel();
            return;
          }
          lastPlayAttemptRef.current = dualPlay.instanceId;
          dispatchPlayCard(room, dualPlay.instanceId, undefined, undefined, undefined, useAs);
          playGameCue("cardPlay");
          setDualPlay(null);
          clearSel();
        }}
        onDualPlayCancel={() => {
          setDualPlay(null);
          clearSel();
        }}
        onConfirmAction={() => {
          if (!actionConfirm || mainActionBlocked) return;
          if (room) {
            if (actionConfirm.kind === DragKind.Play) dispatchPlayCard(room, actionConfirm.instanceId);
            else if (actionConfirm.kind === "digivolve")
              intents.digivolve(room, actionConfirm.permanentId, actionConfirm.instanceId);
            else intents.dnaDigivolve(room, actionConfirm.materialPermanentIds, actionConfirm.instanceId);
          }
          playGameCue(actionConfirm.kind === DragKind.Play ? "cardPlay" : "digivolve");
          setActionConfirm(null);
          clearSel();
        }}
        onDigivolveNormally={
          actionConfirm?.kind === "dna" && actionConfirm.normalPermanentId
            ? () => {
                const pending = actionConfirm;
                const base = findPermanent(pending.normalPermanentId!);
                setActionConfirm(null);
                if (base) digivolveWithChoice(pending.normalPermanentId!, pending.instanceId, pending.cardId, base);
              }
            : undefined
        }
        onConfirmCancel={() => {
          setActionConfirm(null);
          clearSel();
        }}
        onAppFusion={(linkedInstanceId) => {
          if (!appFusionChoice) return;
          const liveEntry = handEntries.find((entry) => entry.instanceId === appFusionChoice.handInstanceId);
          const liveHost = you.battleArea.find(
            (candidate) => candidate.permanentId === appFusionChoice.hostPermanentId,
          );
          const liveRoute =
            liveEntry && liveHost
              ? appFusionRoutesForHost(liveEntry.appFusionRoutes ?? [], liveHost).find(
                  (route) => route.linkedInstanceId === linkedInstanceId,
                )
              : undefined;
          if (room && appFusionActionAvailable() && liveEntry && liveHost && liveRoute) {
            intents.appFusion(room, liveHost.permanentId, liveEntry.instanceId, liveRoute.linkedInstanceId);
            playGameCue("digivolve");
          }
          setAppFusionChoice(null);
          clearSel();
        }}
        onAppFusionNormalEvolution={
          appFusionLive?.normalEvolutionLegal
            ? () => {
                const { entry, host } = appFusionLive;
                if (!entry || !host || !appFusionActionAvailable()) return;
                setAppFusionChoice(null);
                digivolveWithChoice(host.permanentId, entry.instanceId, entry.cardId, host);
              }
            : undefined
        }
        onAppFusionCancel={() => {
          setAppFusionChoice(null);
          clearSel();
        }}
        onEvoCost={(option) => {
          if (!evoCostChoice || mainActionBlocked) return;
          if (room)
            intents.digivolve(
              room,
              evoCostChoice.permanentId,
              evoCostChoice.handInstanceId,
              option.type === "alternate",
              option.alternateRequirementIndex,
            );
          setEvoCostChoice(null);
          clearSel();
        }}
        onEvoCostCancel={() => {
          setEvoCostChoice(null);
          clearSel();
        }}
        onAssembly={(materialInstanceIds) => {
          if (!assemblyPick || mainActionBlocked) return;
          if (room) {
            lastPlayAttemptRef.current = assemblyPick.instanceId;
            playGameCue("cardPlay");
            dispatchPlayCard(room, assemblyPick.instanceId, undefined, undefined, { materialInstanceIds });
          }
          setAssemblyPick(null);
          clearSel();
        }}
        onAssemblySkip={() => {
          if (!assemblyPick || mainActionBlocked) return;
          if (room) {
            lastPlayAttemptRef.current = assemblyPick.instanceId;
            playGameCue("cardPlay");
            dispatchPlayCard(room, assemblyPick.instanceId);
          }
          setAssemblyPick(null);
          clearSel();
        }}
        onAssemblyCancel={() => {
          setAssemblyPick(null);
          clearSel();
        }}
        onDigiXros={(materialInstanceIds, expanderPermanentIds) => {
          if (!digiXrosPick || mainActionBlocked) return;
          if (room)
            dispatchPlayCard(room, digiXrosPick.instanceId, undefined, { materialInstanceIds, expanderPermanentIds });
          setDigiXrosPick(null);
          clearSel();
        }}
        onDigiXrosSkip={() => {
          if (!digiXrosPick || mainActionBlocked) return;
          if (room) dispatchPlayCard(room, digiXrosPick.instanceId);
          setDigiXrosPick(null);
          clearSel();
        }}
        onDigiXrosCancel={() => {
          setDigiXrosPick(null);
          clearSel();
        }}
      />

      {cardMenuPermanent && cardMenu && !decision ? (
        <FieldCardMenu
          permanent={cardMenuPermanent}
          presentedPermanent={findPresentedPermanent(cardMenuPermanent.permanentId) ?? cardMenuPermanent}
          side={cardMenu.side}
          x={cardMenu.x}
          y={cardMenu.y}
          container={boardRef.current}
          returnFocusTo={permRefs.current[cardMenuPermanent.permanentId]}
          keywordLabels={demoConnection?.keywordLabels?.[cardMenuPermanent.permanentId]}
          fate={fateBadges.get(cardMenuPermanent.permanentId)}
          sheet={narrowGameLayout}
          stackCards={stackCardsOf(cardMenuPermanent)}
          mine={cardMenu.side === "you"}
          activatable={cardMenu.side === "you" && isMyTurn}
          // Same gate as the action bar: a breeding Digimon only moves out at
          // level 3, so below that the action would just refuse.
          promotable={
            cardMenu.side === Side.Viewer &&
            cardMenuPermanent.inBreeding &&
            canUseBreedingAction({
              phase: state.phase,
              isMyTurn,
              canHatch: false,
              canMove: canMoveFromBreeding(cardMenuPermanent),
            })
          }
          linkTargets={linkTargetsOfPermanent(cardMenuPermanent)}
          onPromote={() => {
            setCardMenu(null);
            onBreeding();
          }}
          onActivateEffect={(instanceId, effectKey) => {
            setCardMenu(null);
            activateEffect(instanceId, effectKey);
          }}
          onLink={beginLink}
          onViewStack={() => {
            setStackView(cardMenu.permanentId);
            setCardMenu(null);
          }}
          onAttack={() => beginAttack(cardMenu.permanentId)}
          onVortex={() => beginAttack(cardMenu.permanentId, true)}
          onClose={() => setCardMenu(null)}
        />
      ) : null}

      {stackViewPermanent ? (
        <PermanentStackView
          permanent={stackViewPermanent}
          presentedPermanent={findPresentedPermanent(stackViewPermanent.permanentId) ?? stackViewPermanent}
          mine={stackViewPermanent.controllerSeat === viewerSeat}
          side={
            (findPresentedPermanent(stackViewPermanent.permanentId) ?? stackViewPermanent).controllerSeat === viewerSeat
              ? Side.Viewer
              : Side.Opponent
          }
          container={boardRef.current}
          returnFocusTo={permRefs.current[stackViewPermanent.permanentId]}
          keywordLabels={
            demoConnection?.keywordLabels?.[
              (findPresentedPermanent(stackViewPermanent.permanentId) ?? stackViewPermanent).permanentId
            ]
          }
          cards={stackCardsOf(stackViewPermanent)}
          fate={fateBadges.get(stackViewPermanent.permanentId)}
          onAttack={() => beginAttack(stackViewPermanent.permanentId)}
          onVortex={() => beginAttack(stackViewPermanent.permanentId, true)}
          onClose={() => setStackView(null)}
        />
      ) : null}

      <PileViewers
        trashView={trashView}
        securityView={securityView}
        viewer={you}
        opponent={opp}
        opponentName={shownOpp.displayName || t("game.opponent")}
        sheet={narrowGameLayout}
        onCloseTrash={() => setTrashView(null)}
        onCloseSecurity={() => setSecurityView(null)}
      />
    </>
  );

  /** What both battle rows put on a permanent; only the sweep's stagger differs. */
  const permanentChrome: Omit<PermanentChrome, "suspendDelayMs"> = {
    keywordLabels: demoConnection?.keywordLabels,
    compact: narrowGameLayout || shortBoard,
    width: landscapePhone ? LANDSCAPE_PHONE_PERMANENT_WIDTH : arenaPermanentWidth,
    permanentRefs: permRefs,
    effectSourcePermanentIds,
    decisionHighlightPermanentId,
    permanentBursts,
    pendingPermanentIds,
    fateBadges,
    combatImpactIds,
    dpPulses,
    freezePulses,
    attackLunge,
    heldSuspendedIds: cues.heldSuspendedIds,
  };

  return (
    // Every surface that names a card — notices, side panels, combat prompts,
    // decision dialogs — opens it through this one blow-up.
    <CardOpenerProvider
      onOpenCard={(cardId, artId) => {
        setZoomCardId(cardId);
        setZoomArtId(artId);
      }}
    >
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
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            ...battlefield,
            ...({ "--arena-background": battlefield.backgroundImage } as CSSProperties),
          }}
        >
          <OpponentBar
            handStripRef={oppHandStripRef}
            viewerSeat={viewerSeat}
            displayedTurnSeat={displayedTurnSeat}
            displayedTurnCount={displayedTurnCount}
            phase={shownState.phase}
            memory={memory}
            eggDeckCount={breedingOpp.eggDeckCount}
            handCount={shownOpponentHandCount}
            deckCount={shownOpp.deckCount}
            trashCount={shownOpp.trash.length}
            portraitArena={portraitArena}
            narrowGameLayout={narrowGameLayout}
            skippable={cues.presenting || cues.decisionAnimationsPending}
            onOpenLog={() => setHistoryOpen(true)}
            onReportBug={() => setBugReportOpen(true)}
            onSurrender={() => room && intents.surrender(room)}
            onSkipPresentation={() => cues.skipAnimations()}
          />

          {/* One moment at a time. The portrait phone folds both sides into a single
              centred slot; everywhere else the viewer reads the left corner and the
              opponent's moments arrive in the right one. */}
          {!state.gameOver ? (
            <NarrationStack
              narration={cues.narration}
              rejection={cues.rejection}
              compact={collapseNotices}
              securityDockActive={securityBranch !== null || optionBranch !== null}
              onAdvance={cues.advanceNarration}
              onDismissRejection={cues.dismissRejection}
            />
          ) : null}

          {attackAnnouncement && !state.gameOver ? (
            <AttackAnnouncementBanner announcement={attackAnnouncement} />
          ) : null}

          {/* Desktop replaced the sidebar with this slim ticker, kept unobtrusive at the
              board's right edge. The header's log button opens the full history sheet. */}
          {!narrowGameLayout ? (
            <LogTicker
              log={log}
              viewerSeat={viewerSeat}
              displayedTurnSeat={displayedTurnSeat}
              displayedTurnCount={displayedTurnCount}
              memory={memory}
            />
          ) : null}

          {turnTransition ? <TurnBanner transition={turnTransition} viewerSeat={viewerSeat} /> : null}

          {/* field: left column / center / right column */}
          <div
            className="game-field"
            ref={fieldRef}
            style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", overflow: "hidden", position: "relative" }}
          >
            {/* The breeding step is about one slot: the field dims behind the dock,
                which keeps the raising area, the hand that digivolves into it and
                the turn control lit. Notices, panels and dialogs all sit above. */}
            {breedingActionsOpen ? <div className="game-breeding-mode" aria-hidden="true" /> : null}
            {/* Outlines mark the cards the server offered without dimming the field.
                The cards underneath keep every pointer event. */}
            {spotlightOpen ? (
              <TargetingSpotlight subjects={spotlightSubjects} width={boardSize.width} height={boardSize.height} />
            ) : null}
            <LeftPileColumn
              opponent={shownOpp}
              viewer={shownYou}
              pileWidth={arenaPileWidth}
              compactPiles={compactPiles}
              opponentDeckRef={oppDeckRef}
              viewerSecurityRef={yourSecRef}
              opponentDeckRiffling={deckRiffles.has(`${otherSeat(viewerSeat)}:deck`)}
              opponentTrashClassName={trashEffectSource(otherSeat(viewerSeat)) ?? ""}
              securityCount={
                securityDealCounts.get(viewerSeat) ??
                shieldSecurityCount(shownYou.securityCount, heldSecurityCounts.get(viewerSeat))
              }
              securityBreak={securityBreak}
              securityBreakMine={securityBreak?.seat === viewerSeat}
              securityHit={securityHitSeat === viewerSeat}
              securityLanding={securityFlights.has(viewerSeat)}
              onOpenOpponentTrash={shownOpp.trash.length ? () => setTrashView(Side.Opponent) : undefined}
              onOpenViewerSecurity={shownYou.securityCount ? () => setSecurityView(Side.Viewer) : undefined}
            />

            <BattleZones>
              <OpponentBattleRow
                permanents={shownOpp.battleArea}
                chrome={{
                  ...permanentChrome,
                  suspendDelayMs: (index) => unsuspendStagger(otherSeat(viewerSeat), index),
                }}
                attackerPermanent={attackerPerm}
                draggedAttackerPermanent={draggedAttackerPerm}
                vortexMode={vortexMode}
                dropIntentAttrs={dropIntentAttrs}
                onPermanentClick={onOppPerm}
              />
              <MemoryBand
                phaseBanner={phaseBanner}
                memory={memory}
                compact={compactPiles}
                displayedPhase={cues.displayedPhase ?? shownState.phase}
                phaseSweeping={unsuspendSweep !== null}
                memoryPrediction={memoryPrediction}
                turnControlState={turnControlState({ phase: state.phase, turnSeat: state.turnSeat, viewerSeat })}
                endPhaseBlocked={endPhaseBlocked}
                onEndPhase={() => room && intents.endPhase(room)}
              />
              <ViewerBattleRow
                permanents={shownYou.battleArea}
                chrome={{ ...permanentChrome, suspendDelayMs: (index) => unsuspendStagger(viewerSeat, index) }}
                dragIsPlay={dragIsPlay}
                selectedAttackerPermanentId={selPerm}
                isBasePermanent={(perm) =>
                  (handIsDigi && eligibleBase(perm)) ||
                  dragBasePermanentIds.has(perm.permanentId) ||
                  (linkSel?.targetPermanentIds.includes(perm.permanentId) ?? false)
                }
                draggable={(perm) => !handSel && !linkSel && canAttackWith(perm)}
                dropIntentAttrs={dropIntentAttrs}
                baseDropIntentAttrs={baseDropIntentAttrs}
                onPermanentClick={onYourPerm}
                onPermanentPointerDown={startPermDrag}
              />
            </BattleZones>

            {portraitArena ? yourBreedingDock : null}

            <RightPileColumn
              opponent={shownOpp}
              opponentBreeding={breedingOpp}
              viewer={shownYou}
              pileWidth={arenaPileWidth}
              compactPiles={compactPiles}
              viewerDeckRef={yourDeckRef}
              opponentSecurityRef={oppSecRef}
              opponentEggDeckRiffling={deckRiffles.has(`${otherSeat(viewerSeat)}:eggDeck`)}
              viewerDeckRiffling={deckRiffles.has(`${viewerSeat}:deck`)}
              viewerTrashClassName={trashEffectSource(viewerSeat) ?? ""}
              breedingBurst={breedingOpp.breeding ? permanentBursts.get(breedingOpp.breeding.permanentId) : undefined}
              securityCount={
                securityDealCounts.get(otherSeat(viewerSeat)) ??
                shieldSecurityCount(shownOpp.securityCount, heldSecurityCounts.get(otherSeat(viewerSeat)))
              }
              securityBreak={securityBreak}
              securityBreakMine={securityBreak?.seat === otherSeat(viewerSeat)}
              securityHit={securityHitSeat === otherSeat(viewerSeat)}
              securityLanding={securityFlights.has(otherSeat(viewerSeat))}
              securityDrop={{ "data-drop": "opp-security", ...dropIntentAttrs("opp-security") }}
              attackable={canAttackSecurity || canAttackPlayerWith(draggedAttackerPerm, false)}
              onOpenOpponentBreeding={
                opp.breeding ? () => showCardMenu(opp.breeding!.permanentId, Side.Opponent) : undefined
              }
              onAttackSecurity={
                selPerm && canAttackSecurity ? () => attack(selPerm, { kind: "player" }, vortexMode) : undefined
              }
              onOpenOpponentSecurity={shownOpp.securityCount ? () => setSecurityView(Side.Opponent) : undefined}
              onOpenViewerTrash={shownYou.trash.length ? () => setTrashView(Side.Viewer) : undefined}
            />
          </div>

          <PlayerDock
            breedingDock={!portraitArena ? yourBreedingDock : null}
            handDockRef={yourHandDockRef}
            cardWidth={handCardWidth}
            minExposure={handMinExposure}
            cards={shownHandEntries}
            selectedInstanceId={handSel ?? undefined}
            effectSourceInstanceId={
              handEffectSourceInstanceId?.zone === "hand" ? handEffectSourceInstanceId.instanceId : undefined
            }
            selection={
              answerOnBoard && viewerDecision?.kind === "selectCards"
                ? {
                    selectableInstanceIds: viewerDecision.options?.candidateInstanceIds ?? [],
                    pickedInstanceIds: picks,
                    onToggle: toggleDecisionPick,
                    onInspect: setHandPreview,
                  }
                : undefined
            }
            draggingInstanceId={dragIsPlay && drag?.kind === DragKind.Play ? drag.instanceId : undefined}
            shakeInstanceId={shakeHandInstanceId}
            actionBar={
              !selPerm
                ? {
                    selCardId: handPreview ? undefined : selCardId,
                    hasBase:
                      (selEntry?.digivolveTargetPermanentIds.length ?? 0) > 0 ||
                      appFusionHostIdsOf(selEntry?.instanceId).length > 0,
                    linkingCardId: linkSel?.cardId,
                    onCancel: clearSel,
                  }
                : undefined
            }
            eggDeckCount={breedingYou.eggDeckCount}
            handCount={shownHandCount}
            deckCount={shownYou.deckCount}
            trashCount={shownYou.trash.length}
            startDrag={(index, event) => startHandDrag(index, shownHandEntries[index], event)}
            selectCard={(index) => {
              const entry = shownHandEntries[index];
              if (entry) selectHandCard(entry);
            }}
            onHoverChange={setHoveredHandInstanceId}
          />

          <AttackArrowLayer preview={arrow} tracking={trackingArrow} />

          <FieldClashGhosts
            scene={fieldClash}
            permanentRefs={permRefs}
            permanentCenters={permCentersRef}
            permanentCardIds={permCardIdsRef}
            combatImpactIds={combatImpactIds}
            attackLunge={attackLunge}
          />

          <BoardBurstLayer deleteBursts={deleteBursts} drawBursts={drawBursts} drawFlights={drawFlights} />
        </div>

        {/* Desktop plays without the sidebar — its controls moved to the header
            cluster and the end-turn orb; the log opens from the header.
            The narrow layout keeps it: there it collapses into the touch strip. */}
        {narrowGameLayout ? (
          <Sidebar
            phase={state.phase}
            turnCount={state.turnCount}
            memory={memory}
            isMyTurn={isMyTurn}
            canMove={breedingActionsOpen && canMoveOutOfBreeding}
            hasBreeding={!!you.breeding}
            canHatch={breedingActionsOpen && canHatchEgg}
            narrow
            log={log}
            onHatchOrMove={onBreeding}
            onSurrender={() => room && intents.surrender(room)}
            onReportBug={() => setBugReportOpen(true)}
          />
        ) : null}

        {stageEl ? createPortal(overlays, stageEl) : overlays}

        {dragCardId ? (
          <DragGhost
            cardId={dragCardId}
            artId={drag?.artId}
            x={drag!.x}
            y={drag!.y}
            intent={hoveredDragIntent ?? undefined}
            coarsePointer={coarsePointer}
          />
        ) : null}
      </main>
    </CardOpenerProvider>
  );
}
