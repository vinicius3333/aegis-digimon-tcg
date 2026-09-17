import { getCardDefinition, type DigiXrosRequirement } from "@aegis/shared";
import { eligibleDigiXrosCandidateIds } from "../../digiXrosMaterialSelection";
import type { DigiXrosCandidate, DigiXrosEligibleExpander } from "../types";

export interface DigiXrosMaterialPool {
  trashMax: number;
  underTamerMax: number;
  trashCandidates: DigiXrosCandidate[];
  underTamerCandidates: DigiXrosCandidate[];
  candidateById: Map<string, DigiXrosCandidate>;
  eligibleCandidateIds: Set<string>;
  pickedTrash: number;
  pickedUnderTamer: number;
}

/** Zone limits, the candidates each zone offers, and which of them are still pickable. */
export function digiXrosMaterialPool({
  requirement,
  candidates,
  lockedCandidates,
  eligibleExpanders,
  chosenExpanderPermanentIds,
  intrinsicTrashMax,
  picks,
}: {
  requirement: DigiXrosRequirement;
  candidates: DigiXrosCandidate[];
  lockedCandidates: DigiXrosCandidate[];
  eligibleExpanders: DigiXrosEligibleExpander[];
  chosenExpanderPermanentIds: string[];
  intrinsicTrashMax: number;
  picks: string[];
}): DigiXrosMaterialPool {
  const chosenExpanders = eligibleExpanders.filter((e) => chosenExpanderPermanentIds.includes(e.permanentId));
  const underTamerMax = chosenExpanders.reduce((max, e) => Math.max(max, e.underTamerMax), 0);
  const trashMax = chosenExpanders.reduce((max, e) => Math.max(max, e.trashMax), intrinsicTrashMax);
  const trashCandidates = lockedCandidates.filter((c) => c.zone === "trash");
  const underTamerCandidates = lockedCandidates.filter((c) => c.zone === "underTamer");
  const availableCandidates = [
    ...candidates,
    ...(trashMax > 0 ? trashCandidates : []),
    ...(underTamerMax > 0 ? underTamerCandidates : []),
  ];
  const candidateById = new Map(availableCandidates.map((c) => [c.instanceId, c]));
  const candidateDefinitions = availableCandidates.flatMap((candidate) => {
    const definition = getCardDefinition(candidate.cardId);
    return definition === undefined
      ? []
      : [
          {
            instanceId: candidate.instanceId,
            definition,
            digiXrosNames: candidate.digiXrosNames,
            canSubstitute: candidate.canSubstitute,
          },
        ];
  });
  const eligibleCandidateIds = eligibleDigiXrosCandidateIds(requirement, candidateDefinitions, picks);
  for (const picked of picks) eligibleCandidateIds.add(picked);
  const pickedTrash = picks.filter((id) => candidateById.get(id)?.zone === "trash").length;
  const pickedUnderTamer = picks.filter((id) => candidateById.get(id)?.zone === "underTamer").length;
  return {
    trashMax,
    underTamerMax,
    trashCandidates,
    underTamerCandidates,
    candidateById,
    eligibleCandidateIds,
    pickedTrash,
    pickedUnderTamer,
  };
}
