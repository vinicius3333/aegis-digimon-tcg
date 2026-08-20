import { describe, it, expect } from "vitest";
import { CardInstance, Permanent, type CardDefinition } from "@aegis/shared";
import { detachableLinkedCards, detachLinkedCard, detachTraitTokens, type DetachDeps } from "./detach.js";

/**
 * Unit coverage for the PROVISIONAL ＜Detach (trait)＞ capability (see detach.ts's module doc
 * comment for the full reading, the card texts that drove it, and the open questions a KB
 * refresh must settle). These tests exercise the ONE piece of behavior the printed text
 * actually supports — trait-restricted selection among a permanent's own linked cards — plus
 * the reuse of the existing `trash` primitive for the move. No wave-2 card is implemented or
 * referenced here; the fixtures below are synthetic.
 */

let seq = 0;
function linkedCard(cardId: string): CardInstance {
  seq += 1;
  const c = new CardInstance();
  c.instanceId = `detach-inst-${seq}`;
  c.cardId = cardId;
  c.ownerSeat = 0;
  c.faceUp = true;
  return c;
}

function def(cardId: string, traits: string[]): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn: cardId,
    kinds: [],
    colors: [],
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    types: traits,
  } as CardDefinition;
}

function makePermanentWithLinked(cardIds: string[]): { permanent: Permanent; cards: CardInstance[] } {
  const permanent = new Permanent();
  permanent.permanentId = "perm-1";
  const cards = cardIds.map((id) => linkedCard(id));
  for (const c of cards) permanent.linked.push(c);
  return { permanent, cards };
}

describe("detachableLinkedCards — trait-restricted selection among a permanent's own linked cards", () => {
  it("parses the exact trait note from a printed Detach keyword", () => {
    expect(
      detachTraitTokens({
        ...def("DETACH", []),
        effectText: "＜Detach ([Seven Code] trait)＞\n[When Attacking] Draw 1.",
      }),
    ).toEqual(["Seven Code"]);
    expect(detachTraitTokens({ ...def("PLAIN", []), effectText: "＜Blocker＞" })).toEqual([]);
  });

  it("returns only linked cards carrying one of the given trait tokens", () => {
    const { permanent, cards } = makePermanentWithLinked(["SEVEN-CODE-A", "OTHER-B"]);
    const definitions = new Map<string, CardDefinition>([
      ["SEVEN-CODE-A", def("SEVEN-CODE-A", ["Seven Code"])],
      ["OTHER-B", def("OTHER-B", ["Appmon"])],
    ]);
    const definitionOf = (card: CardInstance): CardDefinition => definitions.get(card.cardId)!;

    const eligible = detachableLinkedCards(permanent, ["Seven Code"], definitionOf);

    expect(eligible.map((c) => c.instanceId)).toEqual([cards[0]!.instanceId]);
  });

  it("with no trait tokens, treats every linked card as eligible", () => {
    const { permanent } = makePermanentWithLinked(["A", "B"]);
    const definitionOf = (card: CardInstance): CardDefinition => def(card.cardId, []);

    expect(detachableLinkedCards(permanent, [], definitionOf)).toHaveLength(2);
  });

  it("a permanent with no linked cards has nothing eligible", () => {
    const permanent = new Permanent();
    permanent.permanentId = "perm-empty";
    const definitionOf = (card: CardInstance): CardDefinition => def(card.cardId, []);

    expect(detachableLinkedCards(permanent, ["Seven Code"], definitionOf)).toEqual([]);
  });
});

describe("detachLinkedCard — reuses the existing trash primitive, never re-implements the move", () => {
  it("moves an eligible linked card via the injected trash() and returns it", async () => {
    const { permanent, cards } = makePermanentWithLinked(["SEVEN-CODE-A"]);
    const definitions = new Map<string, CardDefinition>([["SEVEN-CODE-A", def("SEVEN-CODE-A", ["Seven Code"])]]);
    const definitionOf = (card: CardInstance): CardDefinition => definitions.get(card.cardId)!;

    const trashed: string[] = [];
    const deps: DetachDeps = {
      trash: async (instanceIds) => {
        trashed.push(...instanceIds);
        return instanceIds
          .map((id) => cards.find((c) => c.instanceId === id))
          .filter((c): c is CardInstance => c !== undefined);
      },
    };

    const result = await detachLinkedCard(permanent, cards[0]!.instanceId, ["Seven Code"], definitionOf, deps);

    expect(result?.instanceId).toBe(cards[0]!.instanceId);
    expect(trashed).toEqual([cards[0]!.instanceId]);
  });

  it("REVERT-CONFIRM-RED lever: a linked card that does NOT carry the trait is refused, and trash() is never called", async () => {
    const { permanent, cards } = makePermanentWithLinked(["NOT-SEVEN-CODE"]);
    const definitions = new Map<string, CardDefinition>([["NOT-SEVEN-CODE", def("NOT-SEVEN-CODE", ["Appmon"])]]);
    const definitionOf = (card: CardInstance): CardDefinition => definitions.get(card.cardId)!;

    let trashCalled = false;
    const deps: DetachDeps = {
      trash: async (instanceIds) => {
        trashCalled = true;
        return instanceIds
          .map((id) => cards.find((c) => c.instanceId === id))
          .filter((c): c is CardInstance => c !== undefined);
      },
    };

    const result = await detachLinkedCard(permanent, cards[0]!.instanceId, ["Seven Code"], definitionOf, deps);

    expect(result).toBeUndefined();
    expect(trashCalled).toBe(false);
  });

  it("an instanceId that isn't among the permanent's linked cards at all is refused", async () => {
    const { permanent } = makePermanentWithLinked(["SEVEN-CODE-A"]);
    const definitionOf = (card: CardInstance): CardDefinition => def(card.cardId, ["Seven Code"]);
    const deps: DetachDeps = { trash: async (ids) => [] as CardInstance[] };

    const result = await detachLinkedCard(permanent, "not-a-real-instance", ["Seven Code"], definitionOf, deps);

    expect(result).toBeUndefined();
  });
});
