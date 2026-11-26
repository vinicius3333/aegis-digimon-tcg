import { getCardDefinition } from "@aegis/shared";
import type { CardSpec } from "#api/engine/scenario/types";
import { afterEach, describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import { syntheticDefinitions } from "#api/engine/testkit/syntheticDefinitions";
import "#api/cards/index";

const cardId = "BD04-03";
const shishiko = "BD04-08";
const leomon = "BD04-04";
const digitamamon = "BD04-07";
const vanillaLeomon = "BT1-042";
const vanilla = "BT1-009";
const vanillaBoss = "TEST-BD04-03-BOSS";

function registerVanillaBoss() {
  syntheticDefinitions.set(vanillaBoss, {
    ...getCardDefinition(vanilla)!,
    cardId: vanillaBoss,
    imageId: vanillaBoss,
    nameEn: "Boss Testmon",
    types: ["Boss"],
  });
}

async function playLiollmonRevealing(deck: CardSpec[], preferred: string[] = []) {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    { 0: { hand: [{ card: cardId, as: "liollmon" }], deck } },
    { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
  );
  for (const alias of preferred) preferInstanceIds.push(s.inst(alias).instanceId);
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.battleArea.length === 1);
  await drainMicrotasks(40);
  return s;
}

function cardIds(cards: readonly { cardId: string }[]) {
  return cards.map((card) => card.cardId);
}

describe("BD04-03 Liollmon", () => {
  afterEach(() => {
    syntheticDefinitions.clear();
  });

  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD04",
      nameEn: "Liollmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      types: ["Holy Beast"],
      effectText:
        "[On Play] Reveal the top 4 cards of your deck. Add 1 [Shishiko Sakigake] and 1 Digimon card with [Leomon] in its name or the [Boss] trait among them to the hand. Return the rest to the bottom of the deck.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("adds Shishiko Sakigake and a Digimon with [Leomon] in its name and bottoms the rest", async () => {
    const s = await playLiollmonRevealing(
      [
        { card: digitamamon, as: "digitamamon" },
        { card: shishiko, as: "shishiko" },
        { card: vanillaLeomon, as: "loaderLeomon" },
        { card: leomon, as: "leomon" },
        { card: vanilla, as: "unrevealed" },
      ],
      ["leomon"],
    );

    expect(cardIds(s.state.players[0]!.hand)).toEqual(expect.arrayContaining([shishiko, leomon]));
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("unrevealed").instanceId);
    expect(cardIds(s.state.players[0]!.deck.slice(1)).sort()).toEqual([digitamamon, vanillaLeomon].sort());
  });

  it("accepts a [Boss] trait Digimon and ignores Digimon with neither [Leomon] in the name nor [Boss]", async () => {
    registerVanillaBoss();
    const s = await playLiollmonRevealing([vanilla, cardId, digitamamon, vanillaBoss]);

    expect(cardIds(s.state.players[0]!.hand)).toEqual([vanillaBoss]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("adds nothing when no revealed card matches", async () => {
    const s = await playLiollmonRevealing([vanilla, cardId, digitamamon, "BD04-09", vanilla]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.cardId).toBe(vanilla);
    expect(s.state.players[0]!.deck).toHaveLength(5);
  });
});
