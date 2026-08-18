import type { CardDefinition } from "@aegis/shared";
import type { CardInstance } from "@aegis/shared/schema/CardInstance.js";
import type { Permanent } from "@aegis/shared/schema/Permanent.js";

/**
 * PROVISIONAL — the ＜Detach (trait)＞ engine capability (BT26-010, -019, -028, -037, -051,
 * -063, -084).
 *
 * ## Why this is provisional, not a verified port
 *
 * The rules corpus has no definition of "Detach" — verified by
 * `node tools/kb/query.mjs rules "Detach"` (no match) and a grep of
 * `data/kb/rules/*.md` (no hit). The keyword is new to BT26 and unpublished as
 * far as the official sources currently collected by this project. This module
 * therefore implements only the behavior explicitly supported by printed text.
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
 * ## What this module implements
 *
 * Only the eligibility predicate the trait note actually specifies: which of a permanent's own
 * LINKED cards (`permanent.linked`, the same zone `＜Link＞`/`whenLinked` already model) carry
 * the named trait and could therefore be the target of a future "detach" action. The removal
 * itself reuses the engine's existing `trash` primitive (`effects/primitives.ts`) — moving a
 * card out of `permanent.linked` into its owner's trash is already fully correct there (DP
 * recompute, `whenLinkTrashed`, Overflow eligibility all already fire; see EX10-062/EX10-073's
 * "trashing 1 of this Digimon's link cards" cost pattern, which many published cards'
 * `linkEffect` text already uses). This module does NOT duplicate that logic — it only adds the
 * trait-filtered SELECTION step, then calls the existing primitive to perform the actual move.
 *
 * ## Open questions a KB refresh (or Bandai FAQ) must settle before any of the 7 cards ports
 *
 *   1. WHAT happens when a card is detached — is there a stated benefit (draw, DP, memory), or
 *      is "detach" itself the entire effect (e.g. purely a resource/cost verb used by some OTHER
 *      card's text that hasn't printed yet)?
 *   2. WHEN can it be used — an activated [Main]/[Your Turn] ability at will, an immediate-type
 *      reaction, or only as a NAMED COST inside another effect's "by detaching..." clause (the
 *      way "by trashing 1 of this Digimon's link cards" already works as a cost elsewhere)?
 *   3. WHERE does the detached card go — trash (this module's assumption, by analogy to the
 *      existing "trash 1 of this Digimon's link cards" cost pattern), back to hand, or
 *      somewhere else (e.g. a materials pool for [Assembly]/[App Fusion], both of which these
 *      cards' cousins use)?
 *   4. WHOSE ability is it — the host Digimon's (like `whenLinked` grants), or only available
 *      while the card carrying ＜Detach＞ is ITSELF the one sitting in the link zone?
 *   5. Is it once-per-turn, unlimited, or tied to a specific timing window at all?
 *
 * Re-check this module (and delete this comment) the moment `node tools/kb/query.mjs rules
 * "Detach"` returns a hit, or an official FAQ / errata surfaces.
 */

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
