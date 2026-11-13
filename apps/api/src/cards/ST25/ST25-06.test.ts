import { getCardDefinition, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "ST25-06";
const gemmon = "ST25-02";
const liskmon = "ST25-03";
const vanillaRedLevel3 = "BT1-009";

async function playFromHand(card: string, options: { autoAcceptOptional?: boolean; autoDeclineOptional?: boolean }) {
  const s = setupEngine(
    { 0: { battleArea: [{ card: cardId, as: "kanata" }], hand: [{ card, as: "entering" }] } },
    { ...options, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("entering").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);
  return s;
}

describe("ST25-06 Kanata Hondo", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "ST25",
      nameEn: "Kanata Hondo",
      nameJp: "本堂カナタ",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["ALYSION"],
      rarity: "R",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it.each([
    [2, 3],
    [3, 3],
    [0, 3],
  ])("at the start of your turn sets %i memory to %i, but leaves 3 or more alone", async (memory, expected) => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "kanata" }] } });
    s.state.memory = memory;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kanata"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(expected);
  });

  it("leaves 4 memory unchanged at the start of your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "kanata" }] } });
    s.state.memory = 4;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kanata"));
    expect(s.state.memory).toBe(4);
  });

  it("suspends to shield a played ALYSION Digimon from Option effects and give it +3000 DP", async () => {
    const s = await playFromHand(gemmon, { autoAcceptOptional: true });
    const gemmonPermanent = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === gemmon)!;

    expect(s.perm("kanata").isSuspended).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(gemmonPermanent, "beAffected", "Option")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(gemmonPermanent, "beAffected", "Digimon")).toBe(false);
    expect(gemmonPermanent.currentDP).toBe(1000 + 3000 + 3000);
    assertNoLoudGap(s);
  });

  it("does nothing when the player declines to suspend", async () => {
    const s = await playFromHand(liskmon, { autoDeclineOptional: true });
    const liskmonPermanent = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === liskmon)!;

    expect(s.perm("kanata").isSuspended).toBe(false);
    expect(liskmonPermanent.currentDP).toBe(5000);
    expect(observe(s.engine).isRestrictedByEffect(liskmonPermanent, "beAffected", "Option")).toBe(false);
  });

  it("does not trigger for a Digimon without the ALYSION trait", async () => {
    const s = await playFromHand(vanillaRedLevel3, { autoAcceptOptional: true });
    expect(s.perm("kanata").isSuspended).toBe(false);
  });

  it("triggers when an ALYSION Digimon digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "kanata" },
            { card: gemmon, as: "base" },
          ],
          hand: [{ card: liskmon, as: "liskmon" }],
          deck: [vanillaRedLevel3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Kanata Hondo] from your hand"] },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("liskmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kanata").isSuspended && s.state.pendingDecision === undefined);

    expect(s.perm("base").currentDP).toBe(5000 + 2000 + 3000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Option")).toBe(true);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: cardId, as: "kanata", faceUp: true }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("kanata"));
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain(cardId);
  });
});
