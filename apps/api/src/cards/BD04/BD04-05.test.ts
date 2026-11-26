import { getCardDefinition } from "@aegis/shared";
import { afterEach, describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { settle, setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { syntheticDefinitions } from "#api/engine/testkit/syntheticDefinitions";
import "#api/cards/index";

const cardId = "BD04-05";
const leomon = "BD04-04";
const vanilla = "BT1-009";
const vanillaLeomon = "BT1-042";
const vanillaChampion = "BT1-014";
const vanillaBoss = "TEST-BD04-05-BOSS";

function registerVanillaBoss() {
  syntheticDefinitions.set(vanillaBoss, {
    ...getCardDefinition(vanillaChampion)!,
    cardId: vanillaBoss,
    imageId: vanillaBoss,
    nameEn: "Boss Testmon",
    types: ["Boss"],
  });
}

async function digivolveLeomonIntoGrapLeomon() {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: leomon, as: "host" }],
        hand: [{ card: cardId, as: "grapLeomon" }],
        deck: [vanilla, vanilla, vanilla],
      },
      1: { deck: [vanilla, vanilla, vanilla] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("grapLeomon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("host").topCard?.cardId === cardId && s.state.pendingDecision === undefined);
  return s;
}

function battleAreaCardIds(s: Awaited<ReturnType<typeof digivolveLeomonIntoGrapLeomon>>) {
  return s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId);
}

describe("BD04-05 GrapLeomon", () => {
  afterEach(() => {
    syntheticDefinitions.clear();
  });

  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD04",
      nameEn: "GrapLeomon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      types: ["Beastkin"],
      effectText:
        '[When Digivolving] This Digimon gains "[On Deletion] If this Digimon had [Leomon] in its name or the [Boss] trait, play this card suspended without paying the cost." until your opponent\'s turn ends.',
      inheritedEffectText:
        "[Your Turn] This Digimon with [Leomon] in its name or the [Boss] trait gains ＜Security A. +1＞ . (This Digimon checks 1 additional security card.)",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("plays itself suspended without paying the cost when deleted after digivolving", async () => {
    const s = await digivolveLeomonIntoGrapLeomon();
    const memoryBeforeDeletion = s.state.memory;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => battleAreaCardIds(s).includes(cardId));

    expect(battleAreaCardIds(s)).toEqual([cardId]);
    expect(s.state.players[0]!.battleArea[0]!.isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([leomon]);
    expect(s.state.memory).toBe(memoryBeforeDeletion);
  });

  it("keeps the granted effect through the opponent's turn and loses it afterwards", async () => {
    const s = await digivolveLeomonIntoGrapLeomon();
    const grapLeomonId = s.perm("host").permanentId;

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(await advance(s.engine).verb.deletePermanent([grapLeomonId], "byEffect")).toBe(1);

    expect(battleAreaCardIds(s)).toEqual([]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual([cardId, leomon].sort());
  });

  it("does not play itself when GrapLeomon is played instead of digivolved", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "grapLeomon" }] } });
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("grapLeomon").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("gives Security A. +1 during your turn to a host with [Leomon] in its name or the [Boss] trait", async () => {
    registerVanillaBoss();
    const s = setupEngine({
      0: {
        battleArea: [
          { card: vanillaLeomon, as: "leomonHost", under: [cardId] },
          { card: vanillaBoss, as: "bossHost", under: [cardId] },
          { card: vanillaChampion, as: "plainHost", under: [cardId] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("leomonHost"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("bossHost"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("plainHost"), "SecurityAttack")).toBe(0);
  });

  it("gives no Security A. +1 during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: vanillaLeomon, as: "leomonHost", under: [cardId] }] } });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("leomonHost"), "SecurityAttack")).toBe(0);
  });
});
