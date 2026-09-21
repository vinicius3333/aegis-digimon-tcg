/* Everything the board can put over itself, in the order it stacks.

   The mulligan and the hand-card preview come first because they are about the hand, not
   the field. Then the questions — the viewer's decision, the five combat windows — then
   the scenes a check or a played card takes the centre of the screen for, then the
   surfaces the viewer opened for themselves, then the prompts a play has to settle, and
   last the inspectors anchored to one card.

   Each surface is its own component; this file owns only what the match's state means for
   each of them. */

import type { RefObject } from "react";
import { canMoveFromBreeding, canUseBreedingAction, parseActivatable } from "../../boardModel";
import type { GameState, DecisionRequest, Permanent, PlayerState, Seat } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { ActionConfirmationOverlay, MulliganOverlay, printedCardName } from "../../overlay";
import { HandCardPreview } from "./HandCardPreview";
import { DecisionPrompts } from "./DecisionPrompts";
import { CombatWindowPrompts } from "./CombatWindowPrompts";
import { SecurityScenes } from "./SecurityScenes";
import { MatchStatusOverlays } from "./MatchStatusOverlays";
import { PlayChoicePrompts } from "./PlayChoicePrompts";
import { FieldCardMenu } from "./FieldCardMenu";
import { PermanentStackView } from "./PermanentStackView";
import { PileViewers } from "./PileViewers";
import { Side } from "../../side";
import type { GameOverOutcome } from "../../gameOverSplash";
import type { TurnOrder } from "../../overlay";
import type { LogLine } from "../../matchLog";
import type { PendingFateBadge } from "../../pendingFate";
import type { HandEntry } from "../../piece";
import type { AppFusionRoute } from "../../AppFusionChoiceOverlay";
import type { SecurityBranchScene, SecurityClashScene } from "../../securityClash";
import type { ZoneShowcase as ZoneShowcaseCue } from "../../showcases";
import type { SecurityBreakCue } from "../../match/types";
import type { boardActions } from "../boardActions";
import type { combatAnswers } from "../combatAnswers";
import type { matchIntents } from "../matchIntents";
import type { playChoiceAnswers } from "../playChoiceAnswers";
import type { useBoardSelection } from "../hooks/useBoardSelection";
import type { useOverlayState } from "../hooks/useOverlayState";
import type { CombatWindows } from "../model/combatWindows";
import type { DecisionView } from "../model/decisionView";
import type { TriggerDetail } from "../../overlay";

export function MatchOverlays({
  state,
  viewer,
  opponent,
  viewerSeat,
  opponentName,
  decision,
  decisionView,
  allPermanents,
  triggerDetails,
  fateBadges,
  allowsPick,
  onTogglePick,
  combatWindows,
  counterSelection,
  combatWindowAnswers,
  allianceConfirmationPermanentId,
  onConfirmAlliance,
  onCancelAllianceConfirmation,
  scenes,
  collapseNotices,
  log,
  signedIn,
  opponentDropped,
  gameOver,
  overlays,
  selection,
  intents,
  actions,
  playAnswers,
  appFusion,
  handPreviewEntry,
  handPreviewActions,
  appFusionHostIdsOf,
  cardMenuPermanent,
  stackViewPermanent,
  keywordLabels,
  narrowGameLayout,
  isMyTurn,
  mainActionBlocked,
  linkTargetsOfPermanent,
  handEntries,
  shownHandEntries,
  viewerTurnOrder,
  boardRef,
  permanentRefs,
  handDockRef,
  onExit,
}: {
  state: GameState;
  viewer: PlayerState;
  opponent: PlayerState;
  viewerSeat: Seat;
  opponentName: string;
  /** The live decision, whichever seat it belongs to. */
  decision: DecisionRequest | undefined;
  decisionView: DecisionView;
  allPermanents: Permanent[];
  triggerDetails: TriggerDetail[];
  fateBadges: ReadonlyMap<string, PendingFateBadge>;
  allowsPick: (instanceId: string) => boolean;
  onTogglePick: (instanceId: string) => void;
  combatWindows: CombatWindows;
  counterSelection?: {
    instanceId?: string;
    targetPermanentId?: string;
    onSelect: (instanceId?: string) => void;
    handInstanceIds: readonly string[];
  };
  combatWindowAnswers: ReturnType<typeof combatAnswers>;
  allianceConfirmationPermanentId?: string;
  onConfirmAlliance: () => void;
  onCancelAllianceConfirmation: () => void;
  scenes: {
    securityBreak: SecurityBreakCue | null;
    securityClash: SecurityClashScene | null;
    securityBranch: SecurityBranchScene | null;
    optionBranch: SecurityBranchScene | null;
    zoneShowcase: ZoneShowcaseCue | null;
  };
  collapseNotices: boolean;
  log: LogLine[];
  signedIn: boolean;
  opponentDropped: boolean;
  gameOver: { result: GameOverOutcome; reason: string } | undefined;
  overlays: ReturnType<typeof useOverlayState>;
  selection: ReturnType<typeof useBoardSelection>;
  intents: ReturnType<typeof matchIntents>;
  actions: ReturnType<typeof boardActions>;
  playAnswers: ReturnType<typeof playChoiceAnswers>;
  appFusion:
    | {
        entry: HandEntry | undefined;
        host: Permanent | undefined;
        routes: AppFusionRoute[];
        normalEvolutionLegal: boolean;
      }
    | undefined;
  handPreviewEntry: HandEntry | undefined;
  /** The same card in the live hand, or nothing while a decision owns the screen. */
  handPreviewActions: HandEntry | undefined;
  appFusionHostIdsOf: (instanceId: string | undefined) => readonly string[];
  cardMenuPermanent: Permanent | undefined;
  stackViewPermanent: Permanent | undefined;
  keywordLabels: Readonly<Record<string, Readonly<Record<string, string>>>> | undefined;
  narrowGameLayout: boolean;
  isMyTurn: boolean;
  /** Reading stays available while effects resolve, but every game action remains gated. */
  mainActionBlocked: boolean;
  linkTargetsOfPermanent: (perm: Permanent) => readonly string[];
  handEntries: HandEntry[];
  shownHandEntries: HandEntry[];
  viewerTurnOrder: TurnOrder | undefined;
  boardRef: RefObject<HTMLDivElement | null>;
  permanentRefs: RefObject<Record<string, HTMLDivElement | null>>;
  handDockRef: RefObject<HTMLDivElement | null>;
  onExit: (screen: "home" | "lobby") => void;
}) {
  const { t } = useTranslation();
  const { cardMenu } = overlays;
  const presentedCardMenuPermanent = cardMenuPermanent
    ? (actions.findPresentedPermanent(cardMenuPermanent.permanentId) ?? cardMenuPermanent)
    : undefined;
  const presentedStackPermanent = stackViewPermanent
    ? (actions.findPresentedPermanent(stackViewPermanent.permanentId) ?? stackViewPermanent)
    : undefined;
  const allianceConfirmationPermanent = allianceConfirmationPermanentId
    ? allPermanents.find((permanent) => permanent.permanentId === allianceConfirmationPermanentId)
    : undefined;
  return (
    <>
      {decision && decision.seat === viewerSeat && decision.kind === "mulligan" ? (
        <MulliganOverlay
          handCardIds={handEntries.map((h) => h.cardId)}
          turnOrder={viewerTurnOrder}
          onKeep={() => intents.respondMulligan(true)}
          onMulligan={() => intents.respondMulligan(false)}
        />
      ) : null}

      {handPreviewEntry ? (
        <HandCardPreview
          arenaInspection={{
            side: Side.Viewer,
            container: boardRef.current,
            returnFocusTo:
              handDockRef.current?.querySelectorAll<HTMLElement>(".game-hand-card")[
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
            if (selection.handSel) intents.playCard(selection.handSel);
            selection.setHandPreview(null);
          }}
          onLink={() =>
            handPreviewActions &&
            intents.beginLink(
              handPreviewActions.instanceId,
              handPreviewActions.cardId,
              handPreviewActions.linkTargetPermanentIds,
            )
          }
          onActivateEffect={(effect) => {
            intents.activateEffect(effect.instanceId, effect.effectKey);
            selection.setHandPreview(null);
            selection.clearSel();
          }}
          onChooseBase={() => selection.setHandPreview(null)}
          onCancel={() => {
            selection.setHandPreview(null);
            selection.clearSel();
          }}
        />
      ) : null}

      <DecisionPrompts
        decision={decisionView.viewerDecision}
        answerOnBoard={decisionView.answerOnBoard}
        permanents={allPermanents}
        sourceCardId={decisionView.decisionSourceCardId}
        candidates={decisionView.decisionVisible}
        allowsPick={allowsPick}
        picks={overlays.picks}
        min={decisionView.decisionMin}
        max={decisionView.decisionMax}
        triggerDetails={triggerDetails}
        opponentSelecting={
          Boolean(state.pendingDecision) &&
          state.pendingDecision?.seat !== viewerSeat &&
          !state.gameOver &&
          !scenes.zoneShowcase
        }
        onTogglePick={onTogglePick}
        onRespond={intents.respondDecision}
        onOpenDialog={() => overlays.setDecisionAsDialog(true)}
      />

      <CombatWindowPrompts
        state={state}
        blockWindow={combatWindows.blockWindow}
        counterWindow={combatWindows.counterWindow}
        counterSelection={counterSelection}
        allianceWindow={combatWindows.allianceWindow}
        evadeWindow={combatWindows.evadeWindow}
        barrierWindow={combatWindows.barrierWindow}
        {...combatWindowAnswers}
      />

      {allianceConfirmationPermanent ? (
        <ActionConfirmationOverlay
          cardId={allianceConfirmationPermanent.topCard.cardId}
          title={t("overlay.confirmAllianceTitle")}
          detail={t("overlay.confirmAllianceDetail", {
            name: printedCardName(allianceConfirmationPermanent.topCard.cardId),
            dp: allianceConfirmationPermanent.currentDP.toLocaleString(),
          })}
          showSummary={false}
          confirmLabel={t("overlay.confirmAlliance")}
          onConfirm={onConfirmAlliance}
          onCancel={onCancelAllianceConfirmation}
        />
      ) : null}

      {!state.gameOver ? <SecurityScenes {...scenes} compact={collapseNotices} /> : null}

      <MatchStatusOverlays
        log={log}
        historyOpen={overlays.historyOpen}
        zoomCardId={overlays.zoomCardId}
        zoomArtId={overlays.zoomArtId}
        bugReportOpen={overlays.bugReportOpen}
        matchLogId={state.matchLogId}
        signedIn={signedIn}
        opponentDropped={opponentDropped}
        gameOver={
          gameOver
            ? {
                ...gameOver,
                stats: [
                  { value: state.turnCount, label: t("game.stats.turns") },
                  { value: opponent.battleArea.length, label: t("game.stats.oppBoard") },
                  { value: viewer.securityCount, label: t("game.stats.yourSecurity") },
                ],
              }
            : undefined
        }
        onCloseHistory={() => overlays.setHistoryOpen(false)}
        onOpenCard={overlays.setZoomCardId}
        onCloseZoom={() => overlays.setZoomCardId(null)}
        onCloseBugReport={() => overlays.setBugReportOpen(false)}
        onMenu={() => onExit("home")}
        onRematch={() => onExit("lobby")}
      />

      <PlayChoicePrompts
        dualPlay={overlays.dualPlay}
        actionConfirm={overlays.actionConfirm}
        appFusion={
          overlays.appFusionChoice && appFusion
            ? {
                resultCardId: appFusion.entry?.cardId ?? "",
                hostCardId: appFusion.host?.topCard?.cardId ?? "",
                routes: appFusion.routes,
                canEvolveNormally: appFusion.normalEvolutionLegal,
              }
            : null
        }
        evoCostChoice={overlays.evoCostChoice}
        assemblyPick={overlays.assemblyPick}
        digiXrosPick={overlays.digiXrosPick}
        {...playAnswers}
      />

      {cardMenuPermanent && presentedCardMenuPermanent && cardMenu ? (
        <FieldCardMenu
          permanent={cardMenuPermanent}
          presentedPermanent={presentedCardMenuPermanent}
          side={cardMenu.side}
          x={cardMenu.x}
          y={cardMenu.y}
          container={boardRef.current}
          returnFocusTo={permanentRefs.current[cardMenuPermanent.permanentId]}
          keywordLabels={keywordLabels?.[cardMenuPermanent.permanentId]}
          fate={fateBadges.get(cardMenuPermanent.permanentId)}
          sheet={narrowGameLayout}
          stackCards={actions.stackCardsOf(cardMenuPermanent)}
          mine={cardMenu.side === Side.Viewer && !mainActionBlocked}
          activatable={cardMenu.side === Side.Viewer && isMyTurn && !mainActionBlocked}
          // Same gate as the action bar: a breeding Digimon only moves out at
          // level 3, so below that the action would just refuse.
          promotable={
            cardMenu.side === Side.Viewer &&
            !mainActionBlocked &&
            cardMenuPermanent.inBreeding &&
            canUseBreedingAction({
              phase: state.phase,
              isMyTurn,
              canHatch: false,
              canMove: canMoveFromBreeding(cardMenuPermanent),
            })
          }
          linkTargets={mainActionBlocked ? [] : linkTargetsOfPermanent(cardMenuPermanent)}
          onPromote={() => {
            overlays.setCardMenu(null);
            actions.onBreeding();
          }}
          onActivateEffect={(instanceId, effectKey) => {
            overlays.setCardMenu(null);
            intents.activateEffect(instanceId, effectKey);
          }}
          onLink={intents.beginLink}
          onViewStack={() => {
            overlays.setStackView(cardMenu.permanentId);
            overlays.setCardMenu(null);
          }}
          onAttack={() => actions.beginAttack(cardMenu.permanentId)}
          onVortex={() => actions.beginAttack(cardMenu.permanentId, true)}
          onClose={() => overlays.setCardMenu(null)}
        />
      ) : null}

      {stackViewPermanent && presentedStackPermanent ? (
        <PermanentStackView
          permanent={stackViewPermanent}
          presentedPermanent={presentedStackPermanent}
          mine={stackViewPermanent.controllerSeat === viewerSeat}
          side={presentedStackPermanent.controllerSeat === viewerSeat ? Side.Viewer : Side.Opponent}
          container={boardRef.current}
          returnFocusTo={permanentRefs.current[stackViewPermanent.permanentId]}
          keywordLabels={keywordLabels?.[presentedStackPermanent.permanentId]}
          cards={actions.stackCardsOf(stackViewPermanent)}
          fate={fateBadges.get(stackViewPermanent.permanentId)}
          onAttack={() => actions.beginAttack(stackViewPermanent.permanentId)}
          onVortex={() => actions.beginAttack(stackViewPermanent.permanentId, true)}
          onClose={() => overlays.setStackView(null)}
        />
      ) : null}

      <PileViewers
        trashView={overlays.trashView}
        securityView={overlays.securityView}
        viewer={viewer}
        opponent={opponent}
        opponentName={opponentName}
        sheet={narrowGameLayout}
        onCloseTrash={() => overlays.setTrashView(null)}
        onCloseSecurity={() => overlays.setSecurityView(null)}
      />
    </>
  );
}
