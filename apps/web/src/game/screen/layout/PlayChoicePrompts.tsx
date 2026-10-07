/* Everything the screen has to settle before a play can be sent: which half of a dual
   card is being played, a confirmation the player asked for, which materials a DigiXros
   or an Assembly spends, which cost a digivolution pays, and which link an App Fusion
   consumes.

   Each is opened by `prePlayPrompt` (or by the drop itself) and answered here; the
   intent goes out only once the answer is in. */

import { getCardDefinition, type AssemblyRequirement, type DigiXrosRequirement, type Permanent } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { DnaMaterialChoiceOverlay } from "../../DnaMaterialChoiceOverlay";
import type { ProjectedDnaDigivolveRoute } from "../../digivolveModel";
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
import type { EvoCostOption } from "../../digivolveModel";
import { DragKind } from "../enums";
import type { PendingActionConfirmation } from "../types";

export function PlayChoicePrompts({
  dualPlay,
  actionConfirm,
  dnaRoutes,
  dnaPermanents,
  dnaPickedPermanentIds,
  appFusion,
  evoCostChoice,
  memory,
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
  dnaRoutes: readonly ProjectedDnaDigivolveRoute[];
  dnaPermanents: readonly Permanent[];
  dnaPickedPermanentIds: readonly string[];
  /** The overlay stays mounted when its routes go stale, so the player sees why the
   *  action disappeared; an empty route list disables confirmation. */
  appFusion: {
    resultCardId: string;
    hostCardId: string;
    routes: readonly AppFusionRoute[];
    canEvolveNormally: boolean;
  } | null;
  evoCostChoice: { handCardId: string; baseCardId: string; options: EvoCostOption[] } | null;
  /** The viewer's memory, signed from the viewer's side, so a cost can show where it lands. */
  memory: number;
  assemblyPick: { cardId: string; requirements: AssemblyRequirement[]; candidates: AssemblyCandidate[] } | null;
  digiXrosPick: {
    instanceId: string;
    cardId: string;
    requirements: DigiXrosRequirement[];
    candidates: DigiXrosCandidate[];
    lockedCandidates: DigiXrosCandidate[];
    eligibleExpanders: DigiXrosEligibleExpander[];
    intrinsicTrashMax: number;
  } | null;
  onDualPlay: (useAs: "digimon" | "option") => void;
  onDualPlayCancel: () => void;
  onConfirmAction: (materialPermanentIds?: string[]) => void;
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

      {actionConfirm?.kind === "dna" ? (
        <DnaMaterialChoiceOverlay
          key={actionConfirm.instanceId}
          routes={dnaRoutes}
          permanents={dnaPermanents}
          pickedPermanentIds={dnaPickedPermanentIds}
          onConfirm={onConfirmAction}
          onNormalEvolution={onDigivolveNormally}
          onCancel={onConfirmCancel}
        />
      ) : actionConfirm ? (
        <ActionConfirmationOverlay
          cardId={actionConfirm.cardId}
          title={t("overlay.confirmActionTitle")}
          detail={
            actionConfirm.kind === DragKind.Play
              ? t("overlay.confirmPlayDetail", { card: cardName(actionConfirm.cardId) })
              : t("overlay.confirmDigivolveDetail", {
                  card: cardName(actionConfirm.cardId),
                  base: cardName(actionConfirm.baseCardId),
                })
          }
          confirmLabel={actionConfirm.kind === DragKind.Play ? t("overlay.confirmPlay") : t("overlay.confirmDigivolve")}
          alternateLabel={onDigivolveNormally ? t("overlay.digivolveNormally") : undefined}
          onConfirm={() => onConfirmAction()}
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
          baseCardId={evoCostChoice.baseCardId}
          memory={memory}
          options={evoCostChoice.options}
          onConfirm={onEvoCost}
          onCancel={onEvoCostCancel}
        />
      ) : null}

      {assemblyPick ? (
        <AssemblyMaterialOverlay
          playingCardId={assemblyPick.cardId}
          requirements={assemblyPick.requirements}
          candidates={assemblyPick.candidates}
          onConfirm={onAssembly}
          onSkip={onAssemblySkip}
          onCancel={onAssemblyCancel}
        />
      ) : null}

      {digiXrosPick ? (
        <DigiXrosMaterialOverlay
          key={digiXrosPick.instanceId}
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
