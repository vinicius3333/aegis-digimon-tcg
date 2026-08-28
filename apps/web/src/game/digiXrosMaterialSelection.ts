import { CardKind, type CardDefinition, type DigiXrosMaterial, type DigiXrosRequirement } from "@aegis/shared";

type NameOrTraitRef = NonNullable<DigiXrosMaterial["nameOrTrait"]>[number];

function includesFolded(values: readonly string[] | undefined, wanted: string): boolean {
  return values?.some((value) => value.toLocaleLowerCase() === wanted.toLocaleLowerCase()) === true;
}

function matchesNameOrTrait(definition: CardDefinition, ref: NameOrTraitRef): boolean {
  const name = definition.nameEn.toLocaleLowerCase();
  const types = definition.types ?? [];
  return ref.tokens.some((token) => {
    const folded = token.toLocaleLowerCase();
    if (ref.match === "trait") return includesFolded(types, token);
    if (ref.match === "nameExact") return name === folded;
    if (ref.match === "text") {
      return [definition.effectText, definition.inheritedEffectText, definition.securityEffectText].some((text) =>
        text?.toLocaleLowerCase().includes(folded),
      );
    }
    return name.includes(folded);
  });
}

function matchesSlot(
  definition: CardDefinition,
  slot: DigiXrosMaterial,
  digiXrosNames: readonly string[] = [],
): boolean {
  if (!definition.kinds.includes(CardKind.Digimon)) return false;
  const hasStructuredPredicate =
    (slot.names?.length ?? 0) > 0 ||
    (slot.traits?.length ?? 0) > 0 ||
    (slot.traitContains?.length ?? 0) > 0 ||
    (slot.colors?.length ?? 0) > 0 ||
    (slot.nameOrTrait?.length ?? 0) > 0 ||
    slot.level !== undefined ||
    slot.levelMin !== undefined ||
    slot.levelMax !== undefined ||
    slot.levelComparison !== undefined;
  if (!hasStructuredPredicate) return false;
  if (
    slot.names?.length &&
    !slot.names.some((name) =>
      [definition.nameEn, ...digiXrosNames].some((actual) => actual.toLocaleLowerCase() === name.toLocaleLowerCase()),
    )
  )
    return false;
  if (slot.traits?.length && !slot.traits.some((trait) => includesFolded(definition.types, trait))) return false;
  if (
    slot.traitContains?.length &&
    !slot.traitContains.some((token) =>
      definition.types?.some((trait) => trait.toLocaleLowerCase().includes(token.toLocaleLowerCase())),
    )
  )
    return false;
  if (slot.colors?.length && !slot.colors.some((color) => definition.colors.some((actual) => actual === color)))
    return false;
  if (slot.nameOrTrait?.length && !slot.nameOrTrait.some((ref) => matchesNameOrTrait(definition, ref))) return false;
  if (slot.level !== undefined && definition.level !== slot.level) return false;
  if (slot.levelMin !== undefined && (definition.level === undefined || definition.level < slot.levelMin)) return false;
  if (slot.levelMax !== undefined && (definition.level === undefined || definition.level > slot.levelMax)) return false;
  if (slot.levelComparison !== undefined) {
    const level = definition.level;
    if (level === undefined) return false;
    if (slot.levelComparison.op === "lte" && level > slot.levelComparison.value) return false;
    if (slot.levelComparison.op === "gte" && level < slot.levelComparison.value) return false;
    if (slot.levelComparison.op === "eq" && level !== slot.levelComparison.value) return false;
  }
  return true;
}

function selectionFits(requirement: DigiXrosRequirement, candidates: DigiXrosMaterialCandidateDefinition[]): boolean {
  if (requirement.maxMaterials !== undefined && candidates.length > requirement.maxMaterials) return false;
  const slots = requirement.materials;
  if (slots.length === 1) {
    const slot = slots[0]!;
    const mismatches = candidates.filter(
      (candidate) => !matchesSlot(candidate.definition, slot, candidate.digiXrosNames),
    );
    if (mismatches.length > 1 || (mismatches.length === 1 && mismatches[0]?.canSubstitute !== true)) return false;
    if (slot.differentCardNumbers === true) {
      return new Set(candidates.map((candidate) => candidate.definition.cardId)).size === candidates.length;
    }
    if (slot.differentNames === true) {
      return (
        new Set(candidates.map((candidate) => candidate.definition.nameEn.toLocaleLowerCase())).size ===
        candidates.length
      );
    }
    return true;
  }
  if (candidates.length > slots.length) return false;
  const used = new Array<boolean>(slots.length).fill(false);
  const assign = (index: number, substitutionUsed: boolean): boolean => {
    if (index === candidates.length) return true;
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
      if (used[slotIndex]) continue;
      const candidate = candidates[index]!;
      const matches = matchesSlot(candidate.definition, slots[slotIndex]!, candidate.digiXrosNames);
      const substitutes = !matches && !substitutionUsed && candidate.canSubstitute === true;
      if (!matches && !substitutes) continue;
      used[slotIndex] = true;
      if (assign(index + 1, substitutionUsed || substitutes)) return true;
      used[slotIndex] = false;
    }
    return false;
  };
  return assign(0, false);
}

export interface DigiXrosMaterialCandidateDefinition {
  instanceId: string;
  definition: CardDefinition;
  digiXrosNames?: readonly string[];
  canSubstitute?: boolean;
}

/** Instances that can extend the player's current DigiXros material selection. */
export function eligibleDigiXrosCandidateIds(
  requirement: DigiXrosRequirement,
  candidates: DigiXrosMaterialCandidateDefinition[],
  selectedInstanceIds: string[],
): Set<string> {
  const selectedIds = new Set(selectedInstanceIds);
  const selected = candidates.filter((candidate) => selectedIds.has(candidate.instanceId));
  const eligible = new Set(selected.map((candidate) => candidate.instanceId));
  for (const candidate of candidates) {
    if (selectedIds.has(candidate.instanceId)) continue;
    if (selectionFits(requirement, [...selected, candidate])) eligible.add(candidate.instanceId);
  }
  return eligible;
}
