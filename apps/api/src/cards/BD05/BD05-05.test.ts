import { getCardDefinition } from "@aegis/shared";
import type { CardSpec } from "#api/engine/scenario/types";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { drainMicrotasks, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";

const cardId = "BD05-05";
const mukuro = "BD05-09";
const musyamon = "BD05-06";
const karatenmon = "BD05-07";
const swordFlash = "BD05-10";
const redWizard = "BT10-010";
const purpleNonWizard = "BT2-067";
const vanilla = "BT1-009";

async function deleteKotemonRevealing(deck: CardSpec[], preferred: string[] = []) {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    { 0: { battleArea: [{ card: cardId, as: "kotemon" }], deck } },
    { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
  );
  for (const alias of preferred) {
    preferInstanceIds.push(s.inst(alias).instanceId);
  }
  await s.ready();
  expect(await advance(s.engine).verb.deletePermanent([s.perm("kotemon").permanentId], "byEffect")).toBe(1);
  await drainMicrotasks(40);
  return s;
}

function cardIds(cards: readonly { cardId: string }[]) {
  return cards.map((card) => card.cardId);
}

describe("BD05-05 Kotemon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD05",
      nameEn: "Kotemon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      types: ["Reptile"],
      effectText:
        "[On Deletion] Reveal the top 5 cards of your deck. Add 1 [Mukuro Kasukabe] and 1 Digimon card with the [Wizard] trait among them to the hand. Return the rest to the bottom of the deck.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("adds Mukuro Kasukabe and a [Wizard] trait Digimon when deleted and bottoms the rest", async () => {
    const s = await deleteKotemonRevealing(
      [
        { card: swordFlash, as: "option" },
        { card: mukuro, as: "mukuro" },
        { card: purpleNonWizard, as: "nonWizard" },
        { card: musyamon, as: "musyamon" },
        { card: karatenmon, as: "karatenmon" },
        { card: vanilla, as: "unrevealed" },
      ],
      ["musyamon"],
    );

    expect(cardIds(s.state.players[0]!.hand).sort()).toEqual([mukuro, musyamon].sort());
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("unrevealed").instanceId);
    expect(cardIds(s.state.players[0]!.deck.slice(1)).sort()).toEqual([swordFlash, purpleNonWizard, karatenmon].sort());
    expect(cardIds(s.state.players[0]!.trash)).toEqual([cardId]);
  });

  it("accepts a [Wizard] Digimon of another color and ignores Digimon without the trait", async () => {
    const s = await deleteKotemonRevealing([vanilla, purpleNonWizard, swordFlash, redWizard, cardId]);

    expect(cardIds(s.state.players[0]!.hand)).toEqual([redWizard]);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("adds Mukuro Kasukabe alone when no [Wizard] Digimon is revealed", async () => {
    const s = await deleteKotemonRevealing([vanilla, mukuro, purpleNonWizard, swordFlash, cardId]);

    expect(cardIds(s.state.players[0]!.hand)).toEqual([mukuro]);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("does not look past the top 5 cards", async () => {
    const s = await deleteKotemonRevealing([vanilla, vanilla, vanilla, vanilla, vanilla, mukuro, musyamon]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(cardIds(s.state.players[0]!.deck.slice(0, 2))).toEqual([mukuro, musyamon]);
  });
});
