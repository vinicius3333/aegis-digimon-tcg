import {
  CardKind,
  assemblyRequirementFor,
  digiXrosRequirementFor,
  digiXrosTrashNameAllowanceFor,
  digiXrosZoneExpanderFor,
  getCardDefinition,
  type AssemblyRequirement,
  type DigiXrosRequirement,
  type PlayerState,
} from "@aegis/shared";
import { assemblyPossible } from "../../assemblyMaterialSelection";
import type { AssemblyCandidate, DigiXrosCandidate, DigiXrosEligibleExpander } from "../../overlay";
import type { HandEntry } from "../../piece";
import { DragKind } from "../enums";

/** The question a play has to ask before it can be sent, if it has one. */
export type PrePlayPrompt =
  | { kind: "dual"; instanceId: string; cardId: string }
  | { kind: "dna"; instanceId: string; cardId: string; materialPermanentIds: string[] }
  | {
      kind: "digiXros";
      instanceId: string;
      cardId: string;
      requirements: DigiXrosRequirement[];
      candidates: DigiXrosCandidate[];
      lockedCandidates: DigiXrosCandidate[];
      eligibleExpanders: DigiXrosEligibleExpander[];
      intrinsicTrashMax: number;
    }
  | {
      kind: "assembly";
      instanceId: string;
      cardId: string;
      requirement: AssemblyRequirement;
      candidates: AssemblyCandidate[];
    }
  | { kind: DragKind.Play; instanceId: string; cardId: string };

/**
 * What playing this card has to settle before the intent can go to the server: which half of
 * a dual card, which DNA materials, which DigiXros or assembly materials, or simply whether
 * the player meant it.
 *
 * Nothing here decides a rule. Every requirement is read off the card's printed text and the
 * board the server already projects; the screen only asks the question the answer needs.
 */
export function prePlayPromptFor({
  entry,
  viewer,
  confirmDrop,
  actionConfirmationsEnabled,
}: {
  entry: HandEntry | undefined;
  viewer: PlayerState;
  /** True when the play came from a drop, which is the gesture confirmations are for. */
  confirmDrop: boolean;
  actionConfirmationsEnabled: boolean;
}): PrePlayPrompt | undefined {
  if (!entry) return undefined;
  const { instanceId, cardId } = entry;
  if (getCardDefinition(cardId)?.isDualCard) return { kind: "dual", instanceId, cardId };
  const materialPermanentIds = entry.dnaDigivolveRoutes?.[0]?.materialPermanentIds;
  if (materialPermanentIds) return { kind: "dna", instanceId, cardId, materialPermanentIds: [...materialPermanentIds] };
  const requirements = digiXrosRequirementFor(cardId);
  if (requirements && requirements.length > 0)
    return {
      kind: "digiXros",
      instanceId,
      cardId,
      requirements: [...requirements],
      ...digiXrosMaterials({ cardId, instanceId, viewer, requirements }),
    };
  const requirement = assemblyRequirementFor(cardId)?.[0];
  if (requirement) {
    const candidates: AssemblyCandidate[] = viewer.trash.map((ci) => ({
      instanceId: ci.instanceId,
      cardId: ci.cardId,
      artId: ci.artId,
    }));
    const candidateDefinitions = candidates.flatMap((candidate) => {
      const definition = getCardDefinition(candidate.cardId);
      return definition ? [{ instanceId: candidate.instanceId, definition }] : [];
    });
    if (assemblyPossible(requirement, candidateDefinitions))
      return { kind: "assembly", instanceId, cardId, requirement, candidates };
  }
  if (confirmDrop && actionConfirmationsEnabled) return { kind: DragKind.Play, instanceId, cardId };
  return undefined;
}

/** Everything the DigiXros sheet needs to offer: what may be spent, and what may not. */
function digiXrosMaterials({
  cardId,
  instanceId,
  viewer,
  requirements,
}: {
  cardId: string;
  instanceId: string;
  viewer: PlayerState;
  requirements: readonly DigiXrosRequirement[];
}) {
  const playingDefinition = getCardDefinition(cardId);
  const candidates: DigiXrosCandidate[] = [
    ...viewer.hand
      .filter((ci) => ci.instanceId !== instanceId)
      .map((ci) => ({ instanceId: ci.instanceId, cardId: ci.cardId, artId: ci.artId, zone: "hand" as const })),
    ...viewer.battleArea
      .filter((p) => p.topCard)
      .map((p) => ({
        instanceId: p.topCard!.instanceId,
        cardId: p.topCard!.cardId,
        artId: p.topCard!.artId,
        zone: "battle" as const,
        digiXrosNames: [...p.digiXrosNames],
        canSubstitute: p.keywords.includes("DigiXrosSubstitute"),
      })),
  ];
  // `.flatMap()` isn't supported on Colyseus's `ArraySchema` proxy (it throws at runtime —
  // "ArraySchema#flatMap() is not supported"), unlike `.map()`/`.filter()`; build with
  // `.map().flat()` over a real array instead.
  const lockedCandidates: DigiXrosCandidate[] = [
    ...viewer.trash.map((ci) => ({
      instanceId: ci.instanceId,
      cardId: ci.cardId,
      artId: ci.artId,
      zone: "trash" as const,
    })),
    ...viewer.battleArea
      .map((p) => {
        if (!p.topCard || !getCardDefinition(p.topCard.cardId)?.kinds.includes(CardKind.Tamer)) return [];
        return p.stack.map((ci) => ({
          instanceId: ci.instanceId,
          cardId: ci.cardId,
          artId: ci.artId,
          zone: "underTamer" as const,
        }));
      })
      .flat(),
  ];
  const eligibleExpanders: DigiXrosEligibleExpander[] = playingDefinition
    ? viewer.battleArea
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
  const intrinsicTrashNames = digiXrosTrashNameAllowanceFor(cardId);
  const intrinsicTrashMax =
    intrinsicTrashNames !== undefined &&
    viewer.battleArea.every((permanent) => {
      if (!permanent.topCard) return true;
      const definition = getCardDefinition(permanent.topCard.cardId);
      return !definition?.kinds.includes(CardKind.Digimon) || intrinsicTrashNames.includes(definition.nameEn);
    })
      ? (requirements[0]?.maxMaterials ?? 0)
      : 0;
  return { candidates, lockedCandidates, eligibleExpanders, intrinsicTrashMax };
}
