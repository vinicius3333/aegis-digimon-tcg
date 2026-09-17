/* Everything the screen has to settle before a play can be sent: which half of a dual
   card is being played, a confirmation the player asked for, which materials a DigiXros
   or an Assembly spends, which cost a digivolution pays, and which link an App Fusion
   consumes.

   Each is opened by `prePlayPrompt` (or by the drop itself) and answered here; the
   intent goes out only once the answer is in. */

import { getCardDefinition, type AssemblyRequirement, type DigiXrosRequirement } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { AppFusionChoiceOverlay } from "../../AppFusionChoiceOverlay";
import {
  ActionConfirmationOverlay,
  AssemblyMaterialOverlay,
  DigiXrosMaterialOverlay,
  DualPlayChoiceOverlay,
  EvoCostChoiceOverlay,
  type AssemblyCandidate,
  type DigiXrosCandidate,
  type DigiXrosEligibleExpander,
} from "../../overlay";
import type { AppFusionRoute } from "../../AppFusionChoiceOverlay";
import type { EvoCostOption } from "../../boardModel";
import { DragKind } from "../enums";
import type { PendingActionConfirmation } from "../types";

export function PlayChoicePrompts({
  dualPlay,
  actionConfirm,
  appFusion,
  evoCostChoice,
  assemblyPick,
  digiXrosPick,
  onDualPlay,
  onDualPlayCancel,
  onConfirmAction,
  onDigivolveNormally,
  onConfirmCancel,
  onAppFusion,
  onAppFusionNormalEvolution,
  onAppFusionCancel,
  onEvoCost,
  onEvoCostCancel,
  onAssembly,
  onAssemblySkip,
  onAssemblyCancel,
  onDigiXros,
  onDigiXrosSkip,
  onDigiXrosCancel,
}: {
  dualPlay: { instanceId: string; cardId: string } | null;
  actionConfirm: PendingActionConfirmation | null;
  /** The overlay stays mounted when its routes go stale, so the player sees why the
   *  action disappeared; an empty route list disables confirmation. */
  appFusion: {
    resultCardId: string;
    hostCardId: string;
    routes: readonly AppFusionRoute[];
    canEvolveNormally: boolean;
  } | null;
  evoCostChoice: { handCardId: string; baseName: string; options: EvoCostOption[] } | null;
  assemblyPick: { cardId: string; requirement: AssemblyRequirement; candidates: AssemblyCandidate[] } | null;
  digiXrosPick: {
    cardId: string;
    requirements: DigiXrosRequirement[];
    candidates: DigiXrosCandidate[];
    lockedCandidates: DigiXrosCandidate[];
    eligibleExpanders: DigiXrosEligibleExpander[];
    intrinsicTrashMax: number;
  } | null;
  onDualPlay: (useAs: "digimon" | "option") => void;
  onDualPlayCancel: () => void;
  onConfirmAction: () => void;
  /** Only offered when the confirmed DNA play also has a normal digivolution. */
  onDigivolveNormally: (() => void) | undefined;
  onConfirmCancel: () => void;
  onAppFusion: (linkedInstanceId: string) => void;
  onAppFusionNormalEvolution: (() => void) | undefined;
  onAppFusionCancel: () => void;
  onEvoCost: (option: EvoCostOption) => void;
  onEvoCostCancel: () => void;
  onAssembly: (materialInstanceIds: string[]) => void;
  onAssemblySkip: () => void;
  onAssemblyCancel: () => void;
  onDigiXros: (materialInstanceIds: string[], expanderPermanentIds: string[]) => void;
  onDigiXrosSkip: () => void;
  onDigiXrosCancel: () => void;
}) {
  const { t } = useTranslation();
  const cardName = (cardId: string) => getCardDefinition(cardId)?.nameEn ?? cardId;
  return (
    <>
      {dualPlay ? (
        <DualPlayChoiceOverlay cardId={dualPlay.cardId} onChoose={onDualPlay} onCancel={onDualPlayCancel} />
      ) : null}

      {actionConfirm ? (
        <ActionConfirmationOverlay
          cardId={actionConfirm.cardId}
          title={actionConfirm.kind === "dna" ? t("overlay.confirmDnaTitle") : t("overlay.confirmActionTitle")}
          detail={
            actionConfirm.kind === DragKind.Play
              ? t("overlay.confirmPlayDetail", { card: cardName(actionConfirm.cardId) })
              : actionConfirm.kind === "digivolve"
                ? t("overlay.confirmDigivolveDetail", {
                    card: cardName(actionConfirm.cardId),
                    base: cardName(actionConfirm.baseCardId),
                  })
                : t("overlay.confirmDnaDetail", {
                    card: cardName(actionConfirm.cardId),
                    count: actionConfirm.materialPermanentIds.length,
                  })
          }
          confirmLabel={
            actionConfirm.kind === DragKind.Play
              ? t("overlay.confirmPlay")
              : actionConfirm.kind === "dna"
                ? t("overlay.confirmDna")
                : t("overlay.confirmDigivolve")
          }
          alternateLabel={onDigivolveNormally ? t("overlay.digivolveNormally") : undefined}
          onConfirm={onConfirmAction}
          onAlternate={onDigivolveNormally}
          onCancel={onConfirmCancel}
        />
      ) : null}

      {appFusion ? (
        <AppFusionChoiceOverlay
          resultCardId={appFusion.resultCardId}
          hostCardId={appFusion.hostCardId}
          routes={appFusion.routes}
          onConfirm={onAppFusion}
          onNormalEvolution={onAppFusionNormalEvolution}
          onCancel={onAppFusionCancel}
        />
      ) : null}

      {evoCostChoice ? (
        <EvoCostChoiceOverlay
          evolvingCardId={evoCostChoice.handCardId}
          baseName={evoCostChoice.baseName}
          options={evoCostChoice.options}
          onConfirm={onEvoCost}
          onCancel={onEvoCostCancel}
        />
      ) : null}

      {assemblyPick ? (
        <AssemblyMaterialOverlay
          playingCardId={assemblyPick.cardId}
          requirement={assemblyPick.requirement}
          candidates={assemblyPick.candidates}
          onConfirm={onAssembly}
          onSkip={onAssemblySkip}
          onCancel={onAssemblyCancel}
        />
      ) : null}

      {digiXrosPick ? (
        <DigiXrosMaterialOverlay
          playingCardId={digiXrosPick.cardId}
          requirements={digiXrosPick.requirements}
          candidates={digiXrosPick.candidates}
          lockedCandidates={digiXrosPick.lockedCandidates}
          eligibleExpanders={digiXrosPick.eligibleExpanders}
          intrinsicTrashMax={digiXrosPick.intrinsicTrashMax}
          onConfirm={onDigiXros}
          onSkip={onDigiXrosSkip}
          onCancel={onDigiXrosCancel}
        />
      ) : null}
    </>
  );
}
