/* The arena itself: the opponent's bar, the narration and the ticker, the field's three
   columns, the player's dock, and the free-floating cue layers over all of it.

   The overlays are portalled to the app's stage element when there is one, so a dialog
   is never clipped by the board's own overflow; the ghost that follows a held card goes
   to the document body for the same reason. */

import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import type { GameState, Permanent, PlayerState, Seat } from "@aegis/shared";
import { canAttackPlayerWith, canAttackWith, otherSeat, type LogLine } from "../../boardModel";
import { intents } from "../../../net/intents";
import { CardOpenerProvider } from "../../cardLinks";
import { NarrationStack } from "../../NarrationStack";
import { AttackAnnouncementBanner } from "../../SidePanelStack";
import { TargetingSpotlight } from "../../TargetingSpotlight";
import { BATTLE_TIMING_STYLE } from "../../timings";
import { shieldSecurityCount } from "../../securityClash";
import { turnControlState } from "../../turnControl";
import { Side } from "../../side";
import type { DragIntent, DropTarget } from "../../dragIntents";
import type { DropAttrs, HandEntry } from "../../piece";
import type { MatchCues } from "../../match/types";
import { DragKind } from "../enums";
import type { DragState, PermanentChrome, PresentedPlayer, TrackingArrowGeometry } from "../types";
import type { useArenaLayout } from "../hooks/useArenaLayout";
import type { useBoardSelection } from "../hooks/useBoardSelection";
import type { useOverlayState } from "../hooks/useOverlayState";
import type { boardActions } from "../boardActions";
import type { matchIntents } from "../matchIntents";
import type { actionGuards } from "../model/actionGuards";
import { AttackArrowLayer } from "./AttackArrowLayer";
import { BattleZones } from "./BattleZones";
import { BoardBurstLayer } from "./BoardBurstLayer";
import { DragGhost } from "./DragGhost";
import { FieldClashGhosts } from "./FieldClashGhosts";
import { LeftPileColumn } from "./LeftPileColumn";
import { LogTicker } from "./LogTicker";
import { MemoryBand } from "./MemoryBand";
import { OpponentBar } from "./OpponentBar";
import { OpponentBattleRow } from "./OpponentBattleRow";
import { PlayerDock } from "./PlayerDock";
import { RightPileColumn } from "./RightPileColumn";
import { Sidebar } from "./Sidebar";
import { TurnBanner } from "./TurnBanner";
import { ViewerBattleRow } from "./ViewerBattleRow";

export interface BoardAnchors {
  board: RefObject<HTMLDivElement | null>;
  field: RefObject<HTMLDivElement | null>;
  permanents: RefObject<Record<string, HTMLDivElement | null>>;
  permanentCenters: RefObject<Record<string, { x: number; y: number }>>;
  permanentCardIds: RefObject<Record<string, string>>;
  viewerSecurity: RefObject<HTMLDivElement | null>;
  opponentSecurity: RefObject<HTMLDivElement | null>;
  viewerDeck: RefObject<HTMLDivElement | null>;
  opponentDeck: RefObject<HTMLDivElement | null>;
  viewerHandDock: RefObject<HTMLDivElement | null>;
  opponentHandStrip: RefObject<HTMLDivElement | null>;
}

/** The seats as the board shows them, with the counts the readouts print. */
export interface BoardSeats {
  shownViewer: PresentedPlayer;
  shownOpponent: PresentedPlayer;
  breedingViewer: PresentedPlayer;
  breedingOpponent: PresentedPlayer;
  shownHandEntries: HandEntry[];
  shownHandCount: number;
  shownOpponentHandCount: number;
}

/** What the board prints rather than acts on: the turn, the memory and the log. */
export interface BoardReadouts {
  memory: number;
  memoryPrediction: number | undefined;
  displayedTurnSeat: Seat;
  displayedTurnCount: number;
  log: LogLine[];
}

/** What the board lights, outlines or points at while a choice is open. */
export interface BoardTargeting {
  spotlight: { ids: readonly string[]; attacker: string | undefined; open: boolean };
  spotlightSubjects: Parameters<typeof TargetingSpotlight>[0]["subjects"];
  boardSize: { width: number; height: number };
  previewArrow: { from: { x: number; y: number }; to: { x: number; y: number } } | null;
  trackingArrow: TrackingArrowGeometry | null;
  attackerPermanent: Permanent | undefined;
  draggedAttackerPermanent: Permanent | undefined;
  canAttackSecurity: boolean;
  isBasePermanent: (perm: Permanent) => boolean;
}

/** The per-permanent and per-drop-area chrome both halves of the field read. */
export interface BoardChrome {
  permanentChrome: Omit<PermanentChrome, "suspendDelayMs">;
  unsuspendStagger: (seat: Seat, index: number) => number;
  dropIntentAttrs: (target: DropTarget, id?: string) => DropAttrs;
  baseDropIntentAttrs: (permanentId: string) => DropAttrs;
  /** The class an effect resolving from a seat's trash marks the pile with. */
  trashEffectSource: (seat: Seat) => string | undefined;
}

/** The hand strip's own inputs, which the field does not share. */
export interface HandDockInputs {
  effectSourceInstanceId: string | undefined;
  shakeInstanceId: string | undefined;
  selection:
    | {
        selectableInstanceIds: readonly string[];
        pickedInstanceIds: readonly string[];
        onToggle: (instanceId: string) => void;
        onInspect: (instanceId: string) => void;
      }
    | undefined;
  actionBar: { selCardId?: string; hasBase: boolean; linkingCardId?: string; onCancel: () => void } | undefined;
  onHoverChange: (instanceId: string | undefined) => void;
}

export function BoardStage({
  state,
  shownState,
  viewer,
  opponent,
  viewerSeat,
  room,
  battlefield,
  layout,
  anchors,
  cues,
  seats,
  guards,
  readouts,
  targeting,
  chrome,
  handDock,
  selection,
  overlays,
  actions,
  senders,
  drag,
  breedingDock,
  overlayStack,
  stageEl,
  onStartHandDrag,
  onStartPermanentDrag,
  onOpenCard,
}: {
  state: GameState;
  shownState: GameState;
  viewer: PlayerState;
  opponent: PlayerState;
  viewerSeat: Seat;
  room: Parameters<typeof intents.surrender>[0] | undefined;
  battlefield: CSSProperties;
  layout: ReturnType<typeof useArenaLayout>;
  anchors: BoardAnchors;
  cues: MatchCues;
  seats: BoardSeats;
  guards: ReturnType<typeof actionGuards>;
  readouts: BoardReadouts;
  targeting: BoardTargeting;
  chrome: BoardChrome;
  handDock: HandDockInputs;
  selection: ReturnType<typeof useBoardSelection>;
  overlays: ReturnType<typeof useOverlayState>;
  actions: ReturnType<typeof boardActions>;
  senders: ReturnType<typeof matchIntents>;
  drag: {
    state: DragState | null;
    isPlay: boolean;
    cardId: string | undefined;
    /** What releasing here would do, or nothing while the pointer is over no drop area. */
    hoveredIntent: DragIntent | undefined;
  };
  /** The raising area, which a portrait screen puts in the field instead of the dock. */
  breedingDock: ReactNode;
  overlayStack: ReactNode;
  /** The app's stage element, when the document has one to portal the overlays into. */
  stageEl: HTMLElement | null;
  onStartHandDrag: (index: number, event: ReactPointerEvent) => void;
  onStartPermanentDrag: (perm: Permanent, event: ReactPointerEvent) => void;
  onOpenCard: (cardId: string, artId?: string) => void;
}) {
  const other = otherSeat(viewerSeat);
  const { shownViewer, shownOpponent, breedingViewer, breedingOpponent } = seats;
  return (
    // Every surface that names a card — notices, side panels, combat prompts,
    // decision dialogs — opens it through this one blow-up.
    <CardOpenerProvider onOpenCard={onOpenCard}>
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
          ref={anchors.board}
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
            handStripRef={anchors.opponentHandStrip}
            viewerSeat={viewerSeat}
            displayedTurnSeat={readouts.displayedTurnSeat}
            displayedTurnCount={readouts.displayedTurnCount}
            phase={shownState.phase}
            memory={readouts.memory}
            eggDeckCount={breedingOpponent.eggDeckCount}
            handCount={seats.shownOpponentHandCount}
            deckCount={shownOpponent.deckCount}
            trashCount={shownOpponent.trash.length}
            portraitArena={layout.portraitArena}
            narrowGameLayout={layout.narrowGameLayout}
            skippable={cues.presenting || cues.decisionAnimationsPending}
            onOpenLog={() => overlays.setHistoryOpen(true)}
            onReportBug={() => overlays.setBugReportOpen(true)}
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
              compact={layout.collapseNotices}
              securityDockActive={cues.securityBranch !== null || cues.optionBranch !== null}
              onAdvance={cues.advanceNarration}
              onDismissRejection={cues.dismissRejection}
            />
          ) : null}

          {cues.attackAnnouncement && !state.gameOver ? (
            <AttackAnnouncementBanner announcement={cues.attackAnnouncement} />
          ) : null}

          {/* Desktop replaced the sidebar with this slim ticker, kept unobtrusive at the
              board's right edge. The header's log button opens the full history sheet. */}
          {!layout.narrowGameLayout ? (
            <LogTicker
              log={readouts.log}
              viewerSeat={viewerSeat}
              displayedTurnSeat={readouts.displayedTurnSeat}
              displayedTurnCount={readouts.displayedTurnCount}
              memory={readouts.memory}
            />
          ) : null}

          {cues.turnTransition ? <TurnBanner transition={cues.turnTransition} viewerSeat={viewerSeat} /> : null}

          <div
            className="game-field"
            ref={anchors.field}
            style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", overflow: "hidden", position: "relative" }}
          >
            {/* The breeding step is about one slot: the field dims behind the dock,
                which keeps the raising area, the hand that digivolves into it and
                the turn control lit. Notices, panels and dialogs all sit above. */}
            {guards.breedingActionsOpen ? <div className="game-breeding-mode" aria-hidden="true" /> : null}
            {/* Outlines mark the cards the server offered without dimming the field.
                The cards underneath keep every pointer event. */}
            {targeting.spotlight.open ? (
              <TargetingSpotlight
                subjects={targeting.spotlightSubjects}
                width={targeting.boardSize.width}
                height={targeting.boardSize.height}
              />
            ) : null}
            <LeftPileColumn
              opponent={shownOpponent}
              viewer={shownViewer}
              pileWidth={layout.arenaPileWidth}
              compactPiles={layout.compactPiles}
              opponentDeckRef={anchors.opponentDeck}
              viewerSecurityRef={anchors.viewerSecurity}
              opponentDeckRiffling={cues.deckRiffles.has(`${other}:deck`)}
              opponentTrashClassName={chrome.trashEffectSource(other) ?? ""}
              securityCount={
                cues.securityDealCounts.get(viewerSeat) ??
                shieldSecurityCount(shownViewer.securityCount, cues.heldSecurityCounts.get(viewerSeat))
              }
              securityBreak={cues.securityBreak}
              securityBreakMine={cues.securityBreak?.seat === viewerSeat}
              securityHit={cues.securityHitSeat === viewerSeat}
              securityLanding={cues.securityFlights.has(viewerSeat)}
              onOpenOpponentTrash={shownOpponent.trash.length ? () => overlays.setTrashView(Side.Opponent) : undefined}
              onOpenViewerSecurity={shownViewer.securityCount ? () => overlays.setSecurityView(Side.Viewer) : undefined}
            />

            <BattleZones>
              <OpponentBattleRow
                permanents={shownOpponent.battleArea}
                chrome={{
                  ...chrome.permanentChrome,
                  suspendDelayMs: (index) => chrome.unsuspendStagger(other, index),
                }}
                attackerPermanent={targeting.attackerPermanent}
                draggedAttackerPermanent={targeting.draggedAttackerPermanent}
                vortexMode={selection.vortexMode}
                dropIntentAttrs={chrome.dropIntentAttrs}
                onPermanentClick={actions.onOppPerm}
              />
              <MemoryBand
                phaseBanner={cues.phaseBanner}
                memory={readouts.memory}
                compact={layout.compactPiles}
                displayedPhase={cues.displayedPhase ?? shownState.phase}
                phaseSweeping={cues.unsuspendSweep !== null}
                memoryPrediction={readouts.memoryPrediction}
                turnControlState={turnControlState({ phase: state.phase, turnSeat: state.turnSeat, viewerSeat })}
                endPhaseBlocked={guards.endPhaseBlocked}
                onEndPhase={() => room && intents.endPhase(room)}
              />
              <ViewerBattleRow
                permanents={shownViewer.battleArea}
                chrome={{
                  ...chrome.permanentChrome,
                  suspendDelayMs: (index) => chrome.unsuspendStagger(viewerSeat, index),
                }}
                dragIsPlay={drag.isPlay}
                selectedAttackerPermanentId={selection.selPerm}
                isBasePermanent={targeting.isBasePermanent}
                draggable={(perm) => !selection.handSel && !selection.linkSel && canAttackWith(perm)}
                dropIntentAttrs={chrome.dropIntentAttrs}
                baseDropIntentAttrs={chrome.baseDropIntentAttrs}
                onPermanentClick={actions.onYourPerm}
                onPermanentPointerDown={onStartPermanentDrag}
              />
            </BattleZones>

            {layout.portraitArena ? breedingDock : null}

            <RightPileColumn
              opponent={shownOpponent}
              opponentBreeding={breedingOpponent}
              viewer={shownViewer}
              pileWidth={layout.arenaPileWidth}
              compactPiles={layout.compactPiles}
              viewerDeckRef={anchors.viewerDeck}
              opponentSecurityRef={anchors.opponentSecurity}
              opponentEggDeckRiffling={cues.deckRiffles.has(`${other}:eggDeck`)}
              viewerDeckRiffling={cues.deckRiffles.has(`${viewerSeat}:deck`)}
              viewerTrashClassName={chrome.trashEffectSource(viewerSeat) ?? ""}
              breedingBurst={
                breedingOpponent.breeding ? cues.permanentBursts.get(breedingOpponent.breeding.permanentId) : undefined
              }
              securityCount={
                cues.securityDealCounts.get(other) ??
                shieldSecurityCount(shownOpponent.securityCount, cues.heldSecurityCounts.get(other))
              }
              securityBreak={cues.securityBreak}
              securityBreakMine={cues.securityBreak?.seat === other}
              securityHit={cues.securityHitSeat === other}
              securityLanding={cues.securityFlights.has(other)}
              securityDrop={{ "data-drop": "opp-security", ...chrome.dropIntentAttrs("opp-security") }}
              attackable={targeting.canAttackSecurity || canAttackPlayerWith(targeting.draggedAttackerPermanent, false)}
              onOpenOpponentBreeding={
                opponent.breeding
                  ? () => actions.showCardMenu(opponent.breeding!.permanentId, Side.Opponent)
                  : undefined
              }
              onAttackSecurity={
                selection.selPerm && targeting.canAttackSecurity
                  ? () => senders.attack(selection.selPerm!, { kind: "player" }, selection.vortexMode)
                  : undefined
              }
              onOpenOpponentSecurity={
                shownOpponent.securityCount ? () => overlays.setSecurityView(Side.Opponent) : undefined
              }
              onOpenViewerTrash={shownViewer.trash.length ? () => overlays.setTrashView(Side.Viewer) : undefined}
            />
          </div>

          <PlayerDock
            breedingDock={!layout.portraitArena ? breedingDock : null}
            handDockRef={anchors.viewerHandDock}
            cardWidth={layout.handCardWidth}
            minExposure={layout.handMinExposure}
            cards={seats.shownHandEntries}
            selectedInstanceId={selection.handSel ?? undefined}
            effectSourceInstanceId={handDock.effectSourceInstanceId}
            selection={handDock.selection}
            draggingInstanceId={drag.isPlay && drag.state?.kind === DragKind.Play ? drag.state.instanceId : undefined}
            shakeInstanceId={handDock.shakeInstanceId}
            actionBar={handDock.actionBar}
            eggDeckCount={breedingViewer.eggDeckCount}
            handCount={seats.shownHandCount}
            deckCount={shownViewer.deckCount}
            trashCount={shownViewer.trash.length}
            startDrag={onStartHandDrag}
            selectCard={(index) => {
              const entry = seats.shownHandEntries[index];
              if (entry) actions.selectHandCard(entry);
            }}
            onHoverChange={handDock.onHoverChange}
          />

          <AttackArrowLayer preview={targeting.previewArrow} tracking={targeting.trackingArrow} />

          <FieldClashGhosts
            scene={cues.fieldClash}
            permanentRefs={anchors.permanents}
            permanentCenters={anchors.permanentCenters}
            permanentCardIds={anchors.permanentCardIds}
            combatImpactIds={cues.combatImpactIds}
            attackLunge={cues.attackLunge}
          />

          <BoardBurstLayer
            deleteBursts={cues.deleteBursts}
            drawBursts={cues.drawBursts}
            drawFlights={cues.drawFlights}
          />
        </div>

        {/* Desktop plays without the sidebar — its controls moved to the header
            cluster and the end-turn orb; the log opens from the header.
            The narrow layout keeps it: there it collapses into the touch strip. */}
        {layout.narrowGameLayout ? (
          <Sidebar
            phase={state.phase}
            turnCount={state.turnCount}
            memory={readouts.memory}
            isMyTurn={guards.isMyTurn}
            canMove={guards.breedingActionsOpen && guards.canMoveOutOfBreeding}
            hasBreeding={!!viewer.breeding}
            canHatch={guards.breedingActionsOpen && guards.canHatchEgg}
            narrow
            log={readouts.log}
            onHatchOrMove={actions.onBreeding}
            onSurrender={() => room && intents.surrender(room)}
            onReportBug={() => overlays.setBugReportOpen(true)}
          />
        ) : null}

        {stageEl ? createPortal(overlayStack, stageEl) : overlayStack}

        {drag.cardId ? (
          <DragGhost
            cardId={drag.cardId}
            artId={drag.state?.artId}
            x={drag.state!.x}
            y={drag.state!.y}
            intent={drag.hoveredIntent}
            coarsePointer={layout.coarsePointer}
          />
        ) : null}
      </main>
    </CardOpenerProvider>
  );
}
