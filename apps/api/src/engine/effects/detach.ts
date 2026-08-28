import type { CardDefinition } from "@aegis/shared";
import type { CardInstance } from "@aegis/shared/schema/CardInstance.js";
import type { Permanent } from "@aegis/shared/schema/Permanent.js";

/**
 * ＜Detach (trait)＞ engine capability (BT26-010, -019, -028, -037, -051, -063, -084).
 *
 * Q6964 establishes the operative semantics: immediately before a Digimon carrying
 * ＜Detach＞ would be deleted in battle, its controller may trash 1 linked card carrying
 * the noted trait to prevent only that Digimon's deletion. The linked card leaves before
 * battle deletion settles, so its linked effects (notably BT26-010's ＜Piercing＞) are gone
 * when the opponent is deleted.
 *
 * ## What the printed text says (all 7 occurrences, verbatim from cards.json)
 *
 *   BT26-010 (Roleplaymon):  "＜Detach ([Seven Code] trait)＞"
 *   BT26-019 (Mailmon):      "＜Detach ([Seven Code] trait)＞"
 *   BT26-028 (Medicmon):     "＜Detach ([Seven Code] trait)＞"       (also has ＜Barrier＞)
 *   BT26-037 (Weatherdramon):"＜Detach ([Seven Code] trait)＞"       (also has ＜Blocker＞)
 *   BT26-051 (Gomimon):      "＜Detach ([Seven Code] trait)＞"
 *   BT26-063 (Tellermon):    "＜Detach ([Seven Code] trait)＞"
 *   BT26-084 (Copipemon):    "＜Detach ([Seven Code] trait)＞"
 *
 * On every one of the 7 cards the tag stands alone on its own line, styled exactly like a
 * bracket-free keyword ability (＜Barrier＞, ＜Blocker＞ appear the same way, printed with no
 * spelled-out effect because the Comprehensive Rules define their full text elsewhere). The
 * parenthetical is a NOTE (CR §4-22-5: "Notes aren't included in text"), which on a published
 * keyword restricts eligibility rather than adding a clause — e.g. CR §4-22-5's own example
 * cites "＜Alliance＞ and ＜Security A.＞ in the notes enclosed in parentheses for Alliance",
 * i.e. a printed ＜Alliance (trait)＞ restricts WHICH Digimon ＜Alliance＞ may suspend to ones
 * carrying that trait. That is the one piece of structure the 7 cards' text actually commits
 * to: whatever ＜Detach＞ does, it is restricted to cards carrying the named trait
 * ([Seven Code] on every current instance). None of the 7 cards' remaining effect text (the
 * "[When Attacking] ..." / "[Your Turn] [Once Per Turn] When this Digimon gets linked, ..."
 * clauses that follow the tag) references detaching at all — each is a separate, independent
 * ability already expressible with existing primitives (draw, reveal-and-add, the
 * already-modeled `whenLinked` SubTrigger). So there is no card-text evidence anywhere in the
 * BT26 set for what ＜Detach＞ itself DOES when used, nor when it may be used, nor what (if
 * anything) it costs or grants.
 *
 * The eligibility predicate selects which of a permanent's own LINKED cards
 * (`permanent.linked`, the same zone `＜Link＞`/`whenLinked` already model) carry the
 * named trait. The removal reuses the engine's existing `trash` primitive — moving a
 * card out of `permanent.linked` into its owner's trash is already fully correct there (DP
 * recompute, `whenLinkTrashed`, Overflow eligibility all already fire; see EX10-062/EX10-073's
 * "trashing 1 of this Digimon's link cards" cost pattern, which many published cards'
 * `linkEffect` text already uses). This module does NOT duplicate that logic — it only adds the
 * trait-filtered SELECTION step, then calls the existing primitive to perform the actual move.
 *
 * Combat owns the optional reaction window; this module owns parsing, eligibility, and the
 * event-preserving move only. Effect deletion never calls this seam.
 */

/** Trait notes printed by one or more ＜Detach ([trait] trait)＞ keywords on `definition`. */
export function detachTraitTokens(definition: CardDefinition): string[] {
  const text = definition.effectText ?? "";
  return [...text.matchAll(/[<＜]\s*Detach\s*\(\s*\[([^\]]+)]\s*trait\s*\)\s*[>＞]/gi)].map((match) => match[1]!);
}

/**
 * The subset of `permanent`'s own linked cards that carry ANY of `traitTokens` — the one
 * structurally-supported piece of ＜Detach (trait)＞'s reading. Mirrors how `runLink` already
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
 * (the eligibility this module actually supports — see the module doc comment for everything
 * that remains open). Moves the card to its owner's trash via the existing `trash` primitive
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
