/* The in-game board — the design's letterboxed board layout, driven entirely by
   the synchronized GameState and wired to the server through typed intents. The
   client owns zero rules: every action is an intent the server validates, and the
   board is a pure render of what the server sends back (ARCHITECTURE.md §4). */

import { DragKind } from "./screen/enums";
import { LANDSCAPE_PHONE_PERMANENT_WIDTH } from "./screen/queries";
import { useArenaLayout } from "./screen/hooks/useArenaLayout";
import { combatWindowsFor } from "./screen/model/combatWindows";
import { counterTargetIds } from "./overlay/combat/CounterOverlay";
import { isDecoyDecision } from "./decisionPresentation";
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
import { BoardStage, type BoardAnchors } from "./screen/layout/BoardStage";
import { BreedingDock } from "./screen/layout/BreedingDock";
import { MatchOverlays } from "./screen/layout/MatchOverlays";

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
  gameOverReason as modelGameOverReason,
  gameOverResult as modelGameOverResult,
  viewerTurnOrder as modelViewerTurnOrder,
} from "./screen/model/gameOutcome";
import { actionGuards } from "./screen/model/actionGuards";
import { dialogRepeatsEffectNotice } from "./notices";
import { handEntriesOf } from "./screen/model/handEntries";
import { presentedSeats } from "./screen/model/presentedSeats";
import { appFusionLive } from "./screen/model/appFusionLive";
import { memoryPreviewInputs } from "./screen/model/memoryPreviewInputs";
import { spotlightRequest } from "./screen/model/spotlightRequest";
import { triggerDetailsFor } from "./screen/model/triggerDetails";
import { combatAnswers } from "./screen/combatAnswers";
import { playChoiceAnswers } from "./screen/playChoiceAnswers";
import type { DropZoneHit, PermanentChrome } from "./screen/types";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CardKind,
  PRESENTATION_CHANNEL,
  getCardDefinition,
  type DecisionResponse,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { rejectionMessage } from "../rejectionMessages";
import { useTranslation } from "../i18n";
import { useRoom, type MatchMode, type UseRoomResult } from "../net/useRoom";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { selectPresentedState, type StateSnapshot } from "../net/presentedState";
import { joinWithBot } from "../net/client";
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
import "./arenaMobile.css";
import { type DropTarget } from "./dragIntents";
import {
  bothSeated,
  attackTargetIdsOf,
  canAttackPlayerWith,
  displayMemory,
  otherSeat,
  viewerSeatOf,
  breedingSlotClickAction,
} from "./boardModel";
import { openCombatWindow, mirroredCombatWindow } from "./combatWindowModel";
import { buildInstanceIndex } from "./decisionModel";
import { digivolveBasePermanentIds } from "./digivolveModel";
import { buildMatchLog, type LogLine } from "./matchLog";
import { useMatchCues } from "./useMatchCues";
import { TIMINGS } from "./timings";
import { pendingFateBadges } from "./pendingFate";

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
  const layout = useArenaLayout();
  const {
    narrowGameLayout,
    compactPiles,
    shortBoard,
    landscapePhone,
    collapseNotices,
    arenaPileWidth,
    arenaPermanentWidth,
  } = layout;
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

  const selectionState = useBoardSelection({ state, viewerSeat });
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
  } = selectionState;
  const overlayState = useOverlayState({ decision, state, clearSel });
  const {
    cardMenu,
    setCardMenu,
    stackView,
    setStackView,
    picks,
    setPicks,
    decisionAsDialog,
    setZoomCardId,
    setZoomArtId,
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
  } = overlayState;
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
  const [counterHandChoice, setCounterHandChoice] = useState<{
    windowKey: string;
    instanceId: string;
    targetPermanentId?: string;
  }>();

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
  const anchors: BoardAnchors = {
    board: boardRef,
    field: fieldRef,
    permanents: permRefs,
    permanentCenters: permCentersRef,
    permanentCardIds: permCardIdsRef,
    viewerSecurity: yourSecRef,
    opponentSecurity: oppSecRef,
    viewerDeck: yourDeckRef,
    opponentDeck: oppDeckRef,
    viewerHandDock: yourHandDockRef,
    opponentHandStrip: oppHandStripRef,
  };
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
  useEffect(() => {
    if (!openCombatWindowForBarrier?.key.startsWith("counter:")) setCounterHandChoice(undefined);
  }, [openCombatWindowForBarrier?.key]);
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
  const fieldDecisionCandidateIds = new Set<string>();
  if (state) {
    for (const player of state.players) {
      for (const permanent of player.battleArea) {
        fieldDecisionCandidateIds.add(permanent.permanentId);
        fieldDecisionCandidateIds.add(permanent.topCard.instanceId);
      }
    }
  }
  const decisionCandidateIds = decision?.options?.candidateInstanceIds ?? [];
  const fieldEffectDecision =
    decision?.seat === viewerSeat &&
    (decision.kind === "selectCards" || decision.kind === "chooseTargets") &&
    decisionCandidateIds.length > 0 &&
    [...decisionCandidateIds, ...(decision.options?.visibleInstanceIds ?? [])].every((id) =>
      fieldDecisionCandidateIds.has(id),
    );
  // A modal already repeats the source card and its clause, so its matching toast is redundant.
  // A field selection leaves the board visible and is part of the effect's action, so preserve
  // the effect toast there (notably BlackWarGreymon's Blast Digivolve deletion).
  const promptedOwnEffectCardId =
    decision?.seat === viewerSeat && !fieldEffectDecision && dialogRepeatsEffectNotice(decision.options)
      ? decision.sourceCardId
      : undefined;
  const ownEffectNoticeRef = useRef({ dismiss: cues.dismissOwnEffectNotice, release: cues.releaseOwnEffectNotice });
  ownEffectNoticeRef.current = { dismiss: cues.dismissOwnEffectNotice, release: cues.releaseOwnEffectNotice };
  useEffect(() => {
    if (promptedOwnEffectCardId === undefined) return;
    ownEffectNoticeRef.current.dismiss(promptedOwnEffectCardId);
    return () => ownEffectNoticeRef.current.release(promptedOwnEffectCardId);
  }, [promptedOwnEffectCardId]);
  const {
    attackLunge,
    combatImpactIds,
    fieldClash,
    deckRiffles,
    effectSources,
    dpPulses,
    freezePulses,
    phaseBanner,
    pendingPermanentIds,
    permanentBursts,
    optionBranch,
    securityBranch,
    securityBreak,
    securityClash,
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
  /* An activation outlives its own punch: it stays on for as long as the clause it raised is
     being read (`effectSource.ts`). Only a permanent on the field has somewhere to hold that
     light — it glows in place. The trash throwing its top card up and the hand raising an
     Option are finite moves, so they answer to the announcing beat alone; left on the
     sustained flag they stayed thrown up for the whole clause, which reads as the board
     having frozen rather than as the card being pointed at. */
  const announcing = effectSources.filter((activation) => activation.linked !== true);
  const trashEffectSource = (seat: Seat): string | undefined =>
    announcing.some((activation) => activation.seat === seat && activation.site.zone === "trash")
      ? "game-pile--effect-source"
      : undefined;
  const handEffectSourceInstanceId = announcing.find(
    (activation) => activation.seat === viewerSeat && activation.site.zone === "hand",
  )?.site;
  /* Two states, never both on one card: the half-second punch as the effect activates, and
     the steady light it holds for as long as its clause is on screen. Overlapping them
     would leave two animations fighting over the same filter. */
  const effectSourcePermanentIds = new Set(
    announcing.flatMap((activation) => (activation.site.zone === "field" ? [activation.site.permanentId] : [])),
  );
  const effectLinkedPermanentIds = new Set(
    effectSources.flatMap((activation) =>
      activation.linked === true && activation.site.zone === "field" ? [activation.site.permanentId] : [],
    ),
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
        onCancel={() => onExit("lobby")}
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
    heldBlowState: cues.heldBlowState,
    heldDrawState: cues.heldDrawState,
    heldBreedingState: cues.heldBreedingState,
    heldDeletions: cues.heldDeletions,
    optimisticPlayedInstanceId,
  });
  // What the ribbons have announced, for the readouts only: the live turn is what every
  // guard below reads, and what `isMyTurn` must keep meaning.
  const displayedTurnSeat = cues.displayedTurn?.seat ?? shownState.turnSeat;
  const displayedTurnCount = cues.displayedTurn?.count ?? shownState.turnCount;
  const guards = actionGuards({
    state,
    viewer: you,
    viewerSeat,
    decisionOpen: Boolean(decision || state.pendingDecision),
    presenting: cues.presenting,
    phasePresentationPending: cues.phaseTransitionPending || turnTransition !== null || phaseBanner !== null,
  });
  const { isMyTurn, mainActionBlocked, breedingWindow, canHatchEgg, canMoveOutOfBreeding, breedingActionsOpen } =
    guards;
  // The gauge is part of the scene, so it moves when the moment that moved it is narrated.
  const memory = displayMemory(
    { turnSeat: shownState.turnSeat, memory: cues.heldMemory?.memory ?? shownState.memory },
    viewerSeat,
  );
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
    handPreview && !decision && !mainActionBlocked
      ? handEntries.find((entry) => entry.instanceId === handPreview)
      : undefined;

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
  const matchSenders = matchIntents({
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
  const { dispatchPlayCard, playCard, linkCard, attack, digivolveWithChoice } = matchSenders;

  const combatWindows = combatWindowsFor({
    events,
    state,
    viewerSeat,
    isMyTurn,
    mirroredWindow,
    openCombatWindow: openCombatWindowForBarrier,
    answeredCombatWindowKeyRef,
    rolledBackRejectionSeqRef,
  });
  const { markCombatWindowAnswered } = combatWindows;
  const counterWindowKey = `${openCombatWindowForBarrier?.key ?? ""}:${openCombatWindowForBarrier?.stateVersion ?? ""}`;
  const counterSourceInstanceId =
    counterHandChoice?.windowKey === counterWindowKey ? counterHandChoice.instanceId : undefined;
  const selectCounterSource = (instanceId?: string) => {
    setHandPreview(null);
    setCounterHandChoice(instanceId ? { windowKey: counterWindowKey, instanceId } : undefined);
  };
  const counterHandInstanceIds = you.hand.map((card) => card.instanceId);
  const eligibleCounterHandIds =
    combatWindows.counterWindow?.eligibleCounters
      .filter((choice) => counterHandInstanceIds.includes(choice.instanceId))
      .map((choice) => choice.instanceId) ?? [];
  const counterSourceChoices =
    combatWindows.counterWindow?.eligibleCounters.filter((choice) => choice.instanceId === counterSourceInstanceId) ??
    [];
  const counterHostIds = new Set(
    counterSourceChoices.flatMap((choice) => {
      const target = counterTargetIds(choice.effectKey);
      return target ? [target.permanentId] : [];
    }),
  );

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
  const actions = boardActions({
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
  const { findPermanent, handleTap, handleDrop, onYourPerm, onBreeding } = actions;
  handleTapRef.current = handleTap;
  handleDropRef.current = handleDrop;
  const combatWindowAnswers = combatAnswers({
    room,
    acknowledgeBlockWindowLocally: demoConnection?.acknowledgeBlockWindow,
    markAnswered: markCombatWindowAnswered,
  });

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
  const decisionView = decisionViewFor({
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
  const fieldDecision =
    decisionView.answerOnBoard &&
    (decisionView.viewerDecision?.kind === "selectCards" || decisionView.viewerDecision?.kind === "chooseTargets") &&
    decisionView.decisionVisible.some(
      (candidate) => candidate.zone === "battle" || candidate.zone === "opponentBattle",
    );
  const decisionCandidateIdFor = (perm: Permanent) =>
    [perm.topCard.instanceId, perm.permanentId].find((id) => decisionView.decisionSelectable.has(id));
  const {
    viewerDecision,
    decisionHighlightPermanentId,
    decisionSelectable,
    decisionVisibleCardIds,
    decisionInstanceColors,
    decisionDifferentColors,
    decisionDistinctCardIds,
    decisionDistinctNames,
    decisionMax,
  } = decisionView;

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
      decisionDistinctNames,
    });

  const toggleDecisionPick = (instanceId: string) => {
    if (!decisionAllowsPick(instanceId)) return;
    setPicks((current) => nextDecisionPicks({ picks: current, instanceId, max: decisionMax }));
  };
  // What the resolving effect will do to each target the viewer has picked. The
  // fate is the server's own projection (`options.targetFate`); a prompt that
  // carries none badges nothing.
  const fateBadges = pendingFateBadges({ decision: viewerDecision, picks, viewerSeat });

  const spotlight = spotlightRequest({
    breedingWindow,
    linkSel,
    selPerm,
    attackerPerm,
    vortexMode,
    handSel,
    handIsDigi,
    viewer: you,
    handEntries,
    canAttackSecurity,
  });
  spotlightRequestRef.current = spotlight;

  const { memoryPrediction } = memoryPreviewInputs({
    memory,
    dragIsPlay,
    drag,
    dragHover,
    hoveredDragIntent,
    hoveredHandInstanceId,
    handSel,
    handEntries,
    viewer: you,
    opponent: opp,
  });

  const triggerDetails = triggerDetailsFor({
    decision: viewerDecision,
    viewer: you,
    opponent: opp,
    handInstanceIds,
    t,
  });

  const appFusion = appFusionLive({
    choice: appFusionChoice,
    handEntries,
    viewer: you,
    available: appFusionActionAvailable(),
  });
  const playAnswers = playChoiceAnswers({
    room,
    viewer: you,
    handEntries,
    mainActionBlocked,
    appFusionAvailable: appFusionActionAvailable,
    dualPlay,
    actionConfirm,
    appFusionChoice,
    appFusionRoutes: appFusion,
    evoCostChoice,
    assemblyPick,
    digiXrosPick,
    overlays: overlayControls,
    setAppFusionChoice,
    clearSel,
    playGameCue,
    lastPlayAttemptRef,
    dispatchPlayCard,
    digivolveWithChoice,
    findPermanent,
  });
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
    <MatchOverlays
      state={state}
      viewer={you}
      opponent={opp}
      viewerSeat={viewerSeat}
      opponentName={shownOpp.displayName || t("game.opponent")}
      decision={decision}
      decisionView={decisionView}
      allPermanents={allPermanents}
      triggerDetails={triggerDetails}
      fateBadges={fateBadges}
      allowsPick={decisionAllowsPick}
      onTogglePick={toggleDecisionPick}
      combatWindows={combatWindows}
      counterSelection={{
        instanceId: counterSourceInstanceId,
        targetPermanentId: counterHandChoice?.targetPermanentId,
        onSelect: selectCounterSource,
        handInstanceIds: counterHandInstanceIds,
      }}
      combatWindowAnswers={combatWindowAnswers}
      scenes={{ securityBreak, securityClash, securityBranch, optionBranch, zoneShowcase }}
      collapseNotices={collapseNotices}
      log={log}
      signedIn={signedIn}
      opponentDropped={!vsBot && !opp.connected && !state.gameOver}
      gameOver={state.gameOver ? { result: gameOverResult, reason: gameOverReason } : undefined}
      overlays={overlayState}
      selection={selectionState}
      intents={matchSenders}
      actions={actions}
      playAnswers={playAnswers}
      appFusion={appFusion}
      handPreviewEntry={handPreviewEntry}
      handPreviewActions={handPreviewActions}
      appFusionHostIdsOf={appFusionHostIdsOf}
      cardMenuPermanent={cardMenuPermanent}
      stackViewPermanent={stackViewPermanent}
      keywordLabels={demoConnection?.keywordLabels}
      narrowGameLayout={narrowGameLayout}
      isMyTurn={isMyTurn}
      mainActionBlocked={mainActionBlocked}
      linkTargetsOfPermanent={linkTargetsOfPermanent}
      handEntries={handEntries}
      shownHandEntries={shownHandEntries}
      viewerTurnOrder={viewerTurnOrder}
      boardRef={boardRef}
      permanentRefs={permRefs}
      handDockRef={yourHandDockRef}
      onExit={onExit}
    />
  );

  /** What both battle rows put on a permanent; only the sweep's stagger differs. */
  const permanentChrome: Omit<PermanentChrome, "suspendDelayMs"> = {
    keywordLabels: demoConnection?.keywordLabels,
    compact: narrowGameLayout || shortBoard,
    width: landscapePhone ? LANDSCAPE_PHONE_PERMANENT_WIDTH : arenaPermanentWidth,
    permanentRefs: permRefs,
    effectSourcePermanentIds,
    effectLinkedPermanentIds,
    decisionHighlightPermanentId,
    decisionPickedInstanceIds: fieldDecision ? new Set(picks) : new Set<string>(),
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
    <BoardStage
      state={state}
      shownState={shownState}
      viewer={you}
      opponent={opp}
      viewerSeat={viewerSeat}
      room={room}
      battlefield={battlefield}
      layout={layout}
      anchors={anchors}
      cues={cues}
      seats={{
        shownViewer: shownYou,
        shownOpponent: shownOpp,
        breedingViewer: breedingYou,
        breedingOpponent: breedingOpp,
        shownHandEntries,
        shownHandCount,
        shownOpponentHandCount,
      }}
      guards={guards}
      readouts={{ memory, memoryPrediction, displayedTurnSeat, displayedTurnCount, log }}
      targeting={{
        spotlight,
        spotlightSubjects,
        boardSize,
        previewArrow: arrow,
        trackingArrow,
        attackerPermanent: attackerPerm,
        draggedAttackerPermanent: draggedAttackerPerm,
        canAttackSecurity,
        isBasePermanent: (perm) =>
          combatWindows.counterWindow
            ? counterHostIds.has(perm.permanentId)
            : combatWindows.blockWindow
              ? combatWindows.blockWindow.eligibleBlockerIds.includes(perm.permanentId)
              : fieldDecision
                ? decisionCandidateIdFor(perm) !== undefined
                : (handIsDigi && eligibleBase(perm)) ||
                  dragBasePermanentIds.has(perm.permanentId) ||
                  (linkSel?.targetPermanentIds.includes(perm.permanentId) ?? false),
        isDecisionCandidate: (perm) =>
          combatWindows.blockWindow?.eligibleBlockerIds.includes(perm.permanentId) === true ||
          (fieldDecision && decisionCandidateIdFor(perm) !== undefined),
      }}
      chrome={{ permanentChrome, unsuspendStagger, dropIntentAttrs, baseDropIntentAttrs, trashEffectSource }}
      handDock={{
        effectSourceInstanceId:
          handEffectSourceInstanceId?.zone === "hand" ? handEffectSourceInstanceId.instanceId : undefined,
        shakeInstanceId: shakeHandInstanceId,
        selection: combatWindows.counterWindow
          ? {
              selectableInstanceIds: eligibleCounterHandIds,
              pickedInstanceIds: counterSourceInstanceId ? [counterSourceInstanceId] : [],
              onToggle: (instanceId) => {
                if (eligibleCounterHandIds.includes(instanceId)) selectCounterSource(instanceId);
              },
              onInspect: setHandPreview,
            }
          : !fieldDecision && decisionView.answerOnBoard && decisionView.viewerDecision?.kind === "selectCards"
            ? {
                selectableInstanceIds: decisionView.viewerDecision.options?.candidateInstanceIds ?? [],
                pickedInstanceIds: picks,
                onToggle: toggleDecisionPick,
                onInspect: setHandPreview,
              }
            : undefined,
        actionBar:
          !selPerm && !combatWindows.counterWindow && !fieldDecision
            ? {
                selCardId: handPreview ? undefined : selCardId,
                hasBase:
                  (selEntry?.digivolveTargetPermanentIds.length ?? 0) > 0 ||
                  appFusionHostIdsOf(selEntry?.instanceId).length > 0,
                linkingCardId: linkSel?.cardId,
                onCancel: clearSel,
              }
            : undefined,
        onHoverChange: setHoveredHandInstanceId,
      }}
      selection={selectionState}
      overlays={overlayState}
      actions={
        combatWindows.counterWindow
          ? {
              ...actions,
              onYourPerm: (perm) => () => {
                const choices = counterSourceChoices.filter(
                  (choice) => counterTargetIds(choice.effectKey)?.permanentId === perm.permanentId,
                );
                if (choices.length === 1) combatWindowAnswers.onCounter(choices[0]!.instanceId, choices[0]!.effectKey);
                else if (choices.length > 1)
                  setCounterHandChoice((current) =>
                    current ? { ...current, targetPermanentId: perm.permanentId } : current,
                  );
                else setZoomCardId(perm.topCard.cardId);
              },
            }
          : combatWindows.blockWindow
            ? {
                ...actions,
                onYourPerm: (perm) => () => {
                  if (combatWindows.blockWindow?.eligibleBlockerIds.includes(perm.permanentId))
                    combatWindowAnswers.onBlock(perm.permanentId);
                  else setZoomCardId(perm.topCard.cardId);
                },
              }
            : fieldDecision
              ? {
                  ...actions,
                  onYourPerm: (perm) => () => {
                    const candidateId = decisionCandidateIdFor(perm);
                    if (candidateId && (picks.includes(candidateId) || decisionAllowsPick(candidateId)))
                      toggleDecisionPick(candidateId);
                    else setZoomCardId(perm.topCard.cardId);
                  },
                  onOppPerm: (perm) => () => {
                    const candidateId = decisionCandidateIdFor(perm);
                    if (candidateId && (picks.includes(candidateId) || decisionAllowsPick(candidateId)))
                      toggleDecisionPick(candidateId);
                    else setZoomCardId(perm.topCard.cardId);
                  },
                }
              : actions
      }
      senders={matchSenders}
      drag={{ state: drag, isPlay: dragIsPlay, cardId: dragCardId, hoveredIntent: hoveredDragIntent ?? undefined }}
      breedingDock={yourBreedingDock}
      overlayStack={overlays}
      stageEl={stageEl}
      onStartHandDrag={(index, event) => startHandDrag(index, shownHandEntries[index], event)}
      onStartPermanentDrag={startPermDrag}
      onInspectPermanent={{
        viewer: (perm) => actions.onYourPerm(perm)?.(),
        opponent: (perm) => actions.onOppPerm(perm)?.(),
      }}
      onOpenCard={(cardId, artId) => {
        setZoomCardId(cardId);
        setZoomArtId(artId);
      }}
    />
  );
}
