import { getCardDefinition, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "ST25-05";
const reptilimon = "ST25-04";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel5 = "BT1-020";
const vanillaBlueLevel3 = "BT1-027";

async function whenDigivolvingAt(dp: number, opponentBattleArea: PermanentSpec[]) {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: cardId, as: "rubeusdramon", dp }] },
      1: { battleArea: opponentBattleArea },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("rubeusdramon"));
  await settle(() => s.state.pendingDecision === undefined);
  return s;
}

const opponentTrash = (s: ReturnType<typeof setupEngine>) => s.state.players[1]!.trash.map((card) => card.cardId);

describe("ST25-05 Rubeusdramon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "ST25",
      nameEn: "Rubeusdramon",
      colors: ["Red"],
      kinds: ["Digimon", "Option"],
      level: 6,
      playCost: 5,
      dp: 12_000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      types: ["Dragon Warrior", "ALYSION"],
      rarity: "SR",
      isDualCard: true,
      dualEffect: "Burning Drive",
      optionColorRequirements: ["Red"],
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(matchingAlternateDigivolutionRequirement(cardId, reptilimon)).toMatchObject({ level: 5, cost: 3 });
    expect(matchingAlternateDigivolutionRequirement(cardId, vanillaRedLevel5)).toBeUndefined();
  });

  it("can't be played to the field", async () => {
    const s = setupEngine({ 0: { hand: [{ card: cardId, as: "rubeusdramon" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rubeusdramon").instanceId, useAs: "digimon" }).ok,
    ).toBe(false);
  });

  it("deletes up to 11000 DP total at 8000 DP, one 4000 step above the base 7000", async () => {
    const s = await whenDigivolvingAt(8000, [
      { card: vanillaRedLevel3, dp: 6000 },
      { card: vanillaBlueLevel3, dp: 5000 },
    ]);
    expect(opponentTrash(s)).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("keeps the base 7000 DP maximum at 7999 DP", async () => {
    const s = await whenDigivolvingAt(7999, [
      { card: vanillaRedLevel3, dp: 6000 },
      { card: vanillaBlueLevel3, dp: 5000 },
    ]);
    expect(opponentTrash(s)).toHaveLength(1);
  });

  it("adds 8000 to the maximum at its printed 16000 DP boundary", async () => {
    const s = await whenDigivolvingAt(16_000, [
      { card: vanillaRedLevel3, dp: 8000 },
      { card: vanillaBlueLevel3, dp: 7000 },
    ]);
    expect(opponentTrash(s)).toHaveLength(2);
  });

  it.each([
    [12_000, 1],
    [15_999, 1],
    [16_000, 2],
    [7999, 0],
  ])("at %i DP gains Security A. +%i during your turn", async (dp, amount) => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "rubeusdramon", dp }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("rubeusdramon"), "SecurityAttack")).toBe(amount);
  });

  it("gains no Security A. during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "rubeusdramon" }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("rubeusdramon"), "SecurityAttack")).toBe(0);
  });

  it("prints Progress and Piercing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "rubeusdramon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("rubeusdramon"), "Progress")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("rubeusdramon"))).toBe(true);
  });

  it("uses Burning Drive: +10000 DP to an ALYSION Digimon, then deletes up to that DP", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: reptilimon, as: "alysion" }],
          hand: [{ card: cardId, as: "option" }],
        },
        1: {
          battleArea: [
            { card: vanillaRedLevel3, as: "big", dp: 17_000 },
            { card: vanillaBlueLevel3, as: "tooBig", dp: 17_001 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds, declinePrompts: ["Arts Digivolve"] },
    );
    preferInstanceIds.push(s.perm("alysion").topCard.instanceId, s.perm("big").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId));

    expect(s.perm("alysion").currentDP).toBe(7000 + 10_000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("tooBig").permanentId,
    ]);
    expect(s.state.memory).toBe(10 - 5);
  });

  it("gives no DP to a Digimon without the ALYSION trait", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: vanillaRedLevel5, as: "plain" }], hand: [{ card: cardId, as: "option" }] },
        1: { battleArea: [{ card: vanillaRedLevel3, as: "target", dp: 6001 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Arts Digivolve"] },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId));

    expect(s.perm("plain").currentDP).toBe(6000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("digivolves onto the ALYSION Digimon through Arts Digivolve after Burning Drive", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: reptilimon, as: "alysion" }],
          hand: [{ card: cardId, as: "option" }],
          deck: [vanillaRedLevel3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("alysion").topCard.cardId === cardId && s.state.pendingDecision === undefined);

    expect(s.perm("alysion").stack.map((card) => card.cardId)).toEqual([reptilimon]);
    expect(s.state.memory).toBe(10 - 5);
  });
});
