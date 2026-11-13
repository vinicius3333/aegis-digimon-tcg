import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "ST25-04";
const liskmon = "ST25-03";
const rubeusdramon = "ST25-05";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel4 = "BT1-014";
const vanillaRedLevel6 = "ST1-10";

async function digivolveOnto(base: { card: string; dp?: number }) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ ...base, as: "base" }],
        hand: [{ card: cardId, as: "reptilimon" }],
        deck: [vanillaRedLevel3],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("reptilimon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === cardId && s.state.pendingDecision === undefined);
  return s;
}

async function runTurnEnd(host: string, sources: string[]) {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: host, as: "host", under: sources }] },
      1: { security: [{ card: vanillaRedLevel3, as: "firstSecurity" }, vanillaRedLevel3] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const turn = s.engine.runOneTurn();
  const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  await settle(() => mainPhase.isOpen);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await turn;
  return s;
}

describe("ST25-04 Reptilimon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "ST25",
      nameEn: "Reptilimon",
      nameJp: "レプティリモン",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      types: ["Dragon Warrior", "ALYSION"],
      rarity: "U",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(matchingAlternateDigivolutionRequirement(cardId, liskmon)).toMatchObject({ level: 4, cost: 3 });
    expect(matchingAlternateDigivolutionRequirement(cardId, vanillaRedLevel4)).toBeUndefined();
  });

  it("boosts the digivolved Digimon by 3000 DP without Security A. +1 below 12000 DP", async () => {
    const s = await digivolveOnto({ card: vanillaRedLevel4 });
    expect(s.perm("base").currentDP).toBe(7000 + 3000);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(0);

    assertNoLoudGap(s);
  });

  it("does not grant Security A. +1 at 11999 DP", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: vanillaRedLevel6, as: "big", dp: 8999 }],
          hand: [{ card: cardId, as: "reptilimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("big").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reptilimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("big").currentDP === 11_999);
    expect(observe(s.engine).keywordAmount(s.perm("big"), "SecurityAttack")).toBe(0);
  });

  it("grants Security A. +1 to a Digimon boosted to 12000 DP", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: vanillaRedLevel6, as: "big", dp: 9000 }],
          hand: [{ card: cardId, as: "reptilimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("big").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reptilimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("big"), "SecurityAttack") === 1);
    expect(s.perm("big").currentDP).toBe(12_000);
  });

  it("uses its printed Engage to attack at the end of your turn", async () => {
    const s = await runTurnEnd(cardId, []);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("gives a host with [Gemmon] in its text Engage, which attacks at the end of your turn", async () => {
    const s = await runTurnEnd(rubeusdramon, [cardId]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("firstSecurity").instanceId);
  });

  it("gives a host without [Gemmon] in its text no Engage", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: vanillaRedLevel6, as: "host", under: [cardId] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Engage")).toBe(false);

    const ended = await runTurnEnd(vanillaRedLevel6, [cardId]);
    expect(ended.state.players[1]!.security).toHaveLength(2);
  });

  it("shows granted Engage on a Gemmon-text host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: rubeusdramon, as: "host", under: [cardId] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Engage")).toBe(true);
  });
});
