import type { AssemblyMaterial, AssemblyRequirement, CardDefinition } from "@aegis/shared";

/*
 * Best-effort client-side filtering for the Assembly material picker (Comprehensive Rules
 * §7-3). The server validates the whole declaration; this only keeps the picker from
 * offering trash cards that can never satisfy the printed recipe.
 */

type NameOrTraitRef = NonNullable<AssemblyMaterial["nameOrTrait"]>[number];

function traitsOf(definition: CardDefinition): readonly string[] {
  return [...(definition.forms ?? []), ...(definition.attributes ?? []), ...(definition.types ?? [])];
}

function includesFolded(values: readonly string[], wanted: string): boolean {
  const folded = wanted.toLocaleLowerCase();
  return values.some((value) => value.toLocaleLowerCase() === folded);
}

function matchesNameOrTrait(definition: CardDefinition, ref: NameOrTraitRef): boolean {
  const name = definition.nameEn.toLocaleLowerCase();
  const traits = traitsOf(definition);
  return ref.tokens.some((token) => {
    const folded = token.toLocaleLowerCase();
    switch (ref.match) {
      case "trait":
        return includesFolded(traits, token);
      case "traitContains":
        return traits.some((trait) => trait.toLocaleLowerCase().includes(folded));
      case "nameExact":
        return name === folded;
      case "text":
        return [definition.effectText, definition.inheritedEffectText, definition.securityEffectText].some((text) =>
          text?.toLocaleLowerCase().includes(folded),
        );
      case "any":
        return name.includes(folded) || includesFolded(traits, token);
      default:
        return name.includes(folded);
    }
  });
}

/** Whether one trash card can fill `slot`, mirroring the engine's `materialMatchesAssemblySlot`. */
export function assemblyMaterialMatchesSlot(definition: CardDefinition, slot: AssemblyMaterial): boolean {
  const hasNameOrTrait =
    (slot.names?.length ?? 0) > 0 ||
    (slot.namesExact?.length ?? 0) > 0 ||
    (slot.traits?.length ?? 0) > 0 ||
    (slot.nameOrTrait?.length ?? 0) > 0;
  if (!hasNameOrTrait) return false;
  if (slot.kinds?.length && !slot.kinds.some((kind) => definition.kinds.includes(kind as never))) return false;
  if (slot.colors?.length && !slot.colors.some((color) => definition.colors.includes(color as never))) return false;
  if (
    slot.names?.length &&
    !slot.names.some((name) => definition.nameEn.toLocaleLowerCase().includes(name.toLocaleLowerCase()))
  )
    return false;
  if (slot.namesExact?.length && !slot.namesExact.includes(definition.nameEn)) return false;
  if (slot.traits?.length && !slot.traits.some((trait) => includesFolded(traitsOf(definition), trait))) return false;
  if (slot.nameOrTrait?.length && !slot.nameOrTrait.some((ref) => matchesNameOrTrait(definition, ref))) return false;
  const level = definition.level;
  if (slot.level !== undefined && level !== slot.level) return false;
  if (slot.levelMin !== undefined && (level === undefined || level < slot.levelMin)) return false;
  if (slot.levelMax !== undefined && (level === undefined || level > slot.levelMax)) return false;
  return true;
}

export interface AssemblyCandidateDefinition {
  instanceId: string;
  definition: CardDefinition;
}

/** Total material count the recipe demands (§7-3-2-4: exact, no partial Assembly). */
export function assemblyMaterialCount(requirement: AssemblyRequirement): number {
  return requirement.materials.reduce((sum, slot) => sum + slot.count, 0);
}

function selectionFits(requirement: AssemblyRequirement, selected: AssemblyCandidateDefinition[]): boolean {
  const slots = requirement.materials;
  if (selected.length > assemblyMaterialCount(requirement)) return false;
  if (slots.length === 1) {
    const slot = slots[0]!;
    if (!selected.every((candidate) => assemblyMaterialMatchesSlot(candidate.definition, slot))) return false;
    if (slot.differentLevels === true) {
      const levels = selected.map((candidate) => candidate.definition.level);
      if (levels.some((level) => level === undefined)) return false;
      if (new Set(levels).size !== levels.length) return false;
    }
    if (slot.differentNames === true) {
      const names = selected.map((candidate) => candidate.definition.nameEn.toLocaleLowerCase());
      if (new Set(names).size !== names.length) return false;
    }
    return true;
  }
  const remaining = slots.map((slot) => slot.count);
  const assign = (index: number): boolean => {
    if (index === selected.length) return true;
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
      if (remaining[slotIndex]! <= 0) continue;
      if (!assemblyMaterialMatchesSlot(selected[index]!.definition, slots[slotIndex]!)) continue;
      remaining[slotIndex]! -= 1;
      if (assign(index + 1)) return true;
      remaining[slotIndex]! += 1;
    }
    return false;
  };
  return assign(0);
}

/** Trash instances that can extend the player's current Assembly material selection. */
export function eligibleAssemblyCandidateIds(
  requirement: AssemblyRequirement,
  candidates: AssemblyCandidateDefinition[],
  selectedInstanceIds: string[],
): Set<string> {
  const selectedIds = new Set(selectedInstanceIds);
  const selected = candidates.filter((candidate) => selectedIds.has(candidate.instanceId));
  const eligible = new Set(selected.map((candidate) => candidate.instanceId));
  if (selected.length >= assemblyMaterialCount(requirement)) return eligible;
  for (const candidate of candidates) {
    if (selectedIds.has(candidate.instanceId)) continue;
    if (selectionFits(requirement, [...selected, candidate])) eligible.add(candidate.instanceId);
  }
  return eligible;
}

/** Whether the trash holds enough qualifying cards for the recipe to be worth offering. */
export function assemblyPossible(requirement: AssemblyRequirement, candidates: AssemblyCandidateDefinition[]): boolean {
  const needed = assemblyMaterialCount(requirement);
  if (needed === 0) return false;
  const qualifying = candidates.filter((candidate) =>
    requirement.materials.some((slot) => assemblyMaterialMatchesSlot(candidate.definition, slot)),
  );
  return qualifying.length >= needed;
}
