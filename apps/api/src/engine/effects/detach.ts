import type { CardDefinition } from "@aegis/shared";
import type { CardInstance } from "@aegis/shared/schema/CardInstance.js";
import type { ReplacementSubscriptionPrevent } from "./subtriggers.js";
import type { Permanent } from "@aegis/shared/schema/Permanent.js";

/**
 * Detach (Comprehensive Rules v4.2, §16-46): when this Digimon would leave the battle
 * area other than by its owner's effects, its controller may trash a specified link
 * card to prevent that departure. Q6964 additionally proves that a paid link loses
 * its linked effects before the other battle loser is deleted and Piercing is read.
 * https://world.digimoncard.com/rule/pdf/general_rule.pdf
 */

/** Trait notes printed by one or more ＜Detach ([trait] trait)＞ keywords on `definition`. */
export function detachTraitTokens(definition: Pick<CardDefinition, "effectText">): string[] {
  const text = definition.effectText ?? "";
  return [...text.matchAll(/[<＜]\s*Detach\s*\(\s*\[([^\]]+)]\s*trait\s*\)\s*[>＞]/gi)].map((match) => match[1]!);
}

/**
 * The subset of `permanent`'s own linked cards that carry ANY of `traitTokens` — the parameterized
 * payment required by ＜Detach (trait)＞. Mirrors how `runLink` already
 * assembles a card's trait set (`[...types, ...forms, ...attributes]`) for trait matching.
 */
export function detachableLinkedCards(
  permanent: Permanent,
  traitTokens: readonly string[],
  definitionOf: (card: CardInstance) => CardDefinition,
): CardInstance[] {
  if (traitTokens.length === 0) return [...permanent.linked];
  return permanent.linked.filter((card) => {
    const def = definitionOf(card);
    const traits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
    return traitTokens.some((token) => traits.includes(token));
  });
}

/** What `detachLinkedCard` needs from the engine to perform the move (injected, not duplicated). */
export interface DetachDeps {
  /** The existing link/trash primitive (`effects/primitives.ts`'s `trash`). */
  trash(instanceIds: string[]): Promise<CardInstance[]>;
}

/**
 * Detach `instanceId` from `permanent`'s linked cards, PROVIDED it carries one of `traitTokens`
 * (the parameterized payment eligibility). Moves the card to its owner's trash via the existing `trash` primitive
 * (reusing its DP recompute / `whenLinkTrashed` / Overflow handling rather than re-implementing
 * any of it). Returns the detached card, or `undefined` if `instanceId` is not currently one of
 * `permanent`'s linked cards carrying an eligible trait.
 */
export async function detachLinkedCard(
  permanent: Permanent,
  instanceId: string,
  traitTokens: readonly string[],
  definitionOf: (card: CardInstance) => CardDefinition,
  deps: DetachDeps,
): Promise<CardInstance | undefined> {
  const eligible = detachableLinkedCards(permanent, traitTokens, definitionOf);
  if (!eligible.some((card) => card.instanceId === instanceId)) return undefined;
  const [moved] = await deps.trash([instanceId]);
  return moved;
}

/** Build live keyword reactions for the same ordering/identity seam as authored replacements. */
export function detachLeaveReplacements(
  permanentIds: readonly string[],
  deps: {
    permanentById(id: string): Permanent | undefined;
    hasDetach(id: string): boolean;
    traitTokens(id: string): readonly string[];
    definitionOf(card: CardInstance): CardDefinition;
    trash(instanceIds: string[]): Promise<CardInstance[]>;
  },
): ReplacementSubscriptionPrevent[] {
  return permanentIds.flatMap((id, index) => {
    const permanent = deps.permanentById(id);
    if (permanent?.topCard === undefined || permanent.inBreeding || !deps.hasDetach(id)) return [];
    const candidates = detachableLinkedCards(permanent, deps.traitTokens(id), deps.definitionOf);
    if (candidates.length === 0) return [];
    return [
      {
        id: -(index + 1),
        event: "wouldLeavePlay" as const,
        mode: "prevent" as const,
        sourcePermanentId: id,
        sourceInstanceId: permanent.topCard.instanceId,
        activationIdentity: "keyword-detach",
        description: "＜Detach＞: trash 1 eligible link card to prevent leaving the battle area.",
        causeAllows: (cause, resolvingSeat) => !(cause === "byEffect" && resolvingSeat === permanent.controllerSeat),
        protects: (_ctx, leavingId) => leavingId === id && deps.hasDetach(id),
        preventCheck: async (ctx) => {
          const live = deps.permanentById(id);
          if (live === undefined || !deps.hasDetach(id)) return false;
          const traits = deps.traitTokens(id);
          const eligible = detachableLinkedCards(live, traits, deps.definitionOf);
          if (eligible.length === 0) return false;
          const askCtx = {
            ...ctx,
            activeEffectText: `＜Detach${traits.length > 0 ? " (" + traits.map((trait) => "[" + trait + "] trait").join("/") + ")" : ""}＞`,
          };
          const selected = await askCtx.ask.selectCards(askCtx, {
            candidates: eligible.map((card) => card.instanceId),
            min: 0,
            max: 1,
          });
          if (selected.length !== 1) return false;
          return (await detachLinkedCard(live, selected[0]!, traits, deps.definitionOf, deps)) !== undefined;
        },
      },
    ];
  });
}
