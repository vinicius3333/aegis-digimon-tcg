import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "ST25-03";
const gemmon = "ST25-02";
const kanataHondo = "ST25-06";
const appKanataHondo = "BD01-10";
const otherTamer = "BD02-08";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel5 = "BT1-020";

async function digivolveFromGemmon(tamers: string[], hand: string[], options = { autoAcceptOptional: true }) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: gemmon, as: "base" }, ...tamers.map((card) => ({ card }))],
        hand: [{ card: cardId, as: "liskmon" }, ...hand.map((card, index) => ({ card, as: `hand${index}` }))],
        deck: [vanillaRedLevel3],
      },
    },
    { ...options, autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("liskmon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === cardId && s.state.pendingDecision === undefined);
  return s;
}

const battleAreaCardIds = (s: ReturnType<typeof setupEngine>) =>
  s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId);

describe("ST25-03 Liskmon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "ST25",
      nameEn: "Liskmon",
      nameJp: "リスクモン",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 5000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      types: ["Bird Dragon", "ALYSION"],
      rarity: "C",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(matchingAlternateDigivolutionRequirement(cardId, gemmon)).toMatchObject({ level: 3, cost: 2 });
    expect(matchingAlternateDigivolutionRequirement(cardId, vanillaRedLevel3)).toBeUndefined();
  });

  it("plays Kanata Hondo from hand for free when digivolving with no Tamers", async () => {
    const s = await digivolveFromGemmon([], [kanataHondo]);
    expect(battleAreaCardIds(s)).toContain(kanataHondo);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain(kanataHondo);
    expect(s.state.memory).toBe(5 - 2);
    assertNoLoudGap(s);
  });

  it("plays the app Kanata Hondo printing too, by exact name", async () => {
    const s = await digivolveFromGemmon([otherTamer], [appKanataHondo]);
    expect(battleAreaCardIds(s)).toEqual(expect.arrayContaining([otherTamer, appKanataHondo]));
  });

  it("does nothing with 2 Tamers in play", async () => {
    const s = await digivolveFromGemmon([otherTamer, appKanataHondo], [kanataHondo]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain(kanataHondo);
  });

  it("may decline the play", async () => {
    const s = await digivolveFromGemmon([], [kanataHondo], { autoAcceptOptional: false });
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain(kanataHondo);
  });

  it("plays Kanata Hondo on play as well", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "liskmon" },
            { card: kanataHondo, as: "kanata" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liskmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining([cardId, kanataHondo]),
    );
    expect(s.state.memory).toBe(10 - 4);
  });

  it("gives its host Raid as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: vanillaRedLevel5, as: "host", under: [cardId] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
  });
});
