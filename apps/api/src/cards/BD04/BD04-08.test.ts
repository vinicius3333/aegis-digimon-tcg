import { getCardDefinition } from "@aegis/shared";
import { afterEach, describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import { syntheticDefinitions } from "#api/engine/testkit/syntheticDefinitions";
import "#api/cards/index";

const cardId = "BD04-08";
const vanilla = "BT1-009";
const vanillaLeomon = "BT1-042";
const vanillaChampion = "BT1-014";
const vanillaBoss = "TEST-BD04-08-BOSS";
const vanillaBeastkin = "TEST-BD04-08-BEASTKIN";

function registerVanillaWithTrait(syntheticId: string, trait: string) {
  syntheticDefinitions.set(syntheticId, {
    ...getCardDefinition(vanillaChampion)!,
    cardId: syntheticId,
    imageId: syntheticId,
    nameEn: "Trait Testmon",
    types: [trait],
  });
}

async function memoryAtMainPhaseWith(digimon: readonly string[]) {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: cardId, as: "shishiko" },
        ...digimon.map((card, index) => ({ card, as: `digimon${index}` })),
      ],
      deck: [vanilla, vanilla],
    },
  });
  s.state.memory = 3;
  await s.ready();
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  await drainMicrotasks(20);
  const memory = s.state.memory;
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
  return memory;
}

type DeletionOptions = { victim: string; victimSeat?: 0 | 1; decline?: boolean; suspended?: boolean; turnSeat?: 0 | 1 };

async function deleteWithShishiko(options: DeletionOptions) {
  const victimSeat = options.victimSeat ?? 0;
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: cardId, as: "shishiko", suspended: options.suspended ?? false },
          ...(victimSeat === 0 ? [{ card: options.victim, as: "victim" }] : []),
        ],
      },
      1: { battleArea: victimSeat === 1 ? [{ card: options.victim, as: "victim" }] : [] },
    },
    options.decline ? { autoDeclineOptional: true } : { autoAcceptOptional: true },
  );
  s.state.turnSeat = options.turnSeat ?? 0;
  s.state.memory = 0;
  await s.ready();
  expect(await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect")).toBe(1);
  await drainMicrotasks(40);
  return {
    memory: s.state.turnSeat === 0 ? s.state.memory : -s.state.memory,
    suspended: s.perm("shishiko").isSuspended,
  };
}

describe("BD04-08 Shishiko Sakigake", () => {
  afterEach(() => {
    syntheticDefinitions.clear();
  });

  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD04",
      nameEn: "Shishiko Sakigake",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["ALYSION"],
      effectText:
        "[Start of Your Main Phase] If you have a Digimon with [Leomon] in its name or the [Boss] trait, gain 1 memory.\n[All Turns] When any of your Digimon with [Leomon] in their names or the [Boss] trait are deleted, by suspending this Tamer, gain 1 memory.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gains 1 memory at the start of the main phase with a Digimon with [Leomon] in its name", async () => {
    expect(await memoryAtMainPhaseWith([vanillaLeomon])).toBe(4);
  });

  it("gains 1 memory at the start of the main phase with a [Boss] trait Digimon", async () => {
    registerVanillaWithTrait(vanillaBoss, "Boss");
    expect(await memoryAtMainPhaseWith([vanillaBoss])).toBe(4);
  });

  it("gains no memory at the start of the main phase without a matching Digimon", async () => {
    registerVanillaWithTrait(vanillaBeastkin, "Beastkin");
    expect(await memoryAtMainPhaseWith([vanillaChampion, vanillaBeastkin])).toBe(3);
  });

  it("suspends itself to gain 1 memory when your Digimon with [Leomon] in its name is deleted", async () => {
    expect(await deleteWithShishiko({ victim: vanillaLeomon })).toEqual({ memory: 1, suspended: true });
  });

  it("also triggers for a [Boss] trait Digimon during the opponent's turn", async () => {
    registerVanillaWithTrait(vanillaBoss, "Boss");
    expect(await deleteWithShishiko({ victim: vanillaBoss, turnSeat: 1 })).toEqual({ memory: 1, suspended: true });
  });

  it("ignores non-matching Digimon and the opponent's Digimon", async () => {
    registerVanillaWithTrait(vanillaBeastkin, "Beastkin");
    expect(await deleteWithShishiko({ victim: vanillaBeastkin })).toEqual({ memory: 0, suspended: false });
    expect(await deleteWithShishiko({ victim: vanillaLeomon, victimSeat: 1 })).toEqual({
      memory: 0,
      suspended: false,
    });
  });

  it("gains nothing when the suspend cost is declined or cannot be paid", async () => {
    expect(await deleteWithShishiko({ victim: vanillaLeomon, decline: true })).toEqual({
      memory: 0,
      suspended: false,
    });
    expect(await deleteWithShishiko({ victim: vanillaLeomon, suspended: true })).toEqual({
      memory: 0,
      suspended: true,
    });
  });

  it("plays itself without paying the cost when revealed as a security card", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: cardId, as: "shishiko" }] },
        1: { battleArea: [{ card: vanilla, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const memoryBeforeAttack = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === cardId));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBeforeAttack);
  });
});
