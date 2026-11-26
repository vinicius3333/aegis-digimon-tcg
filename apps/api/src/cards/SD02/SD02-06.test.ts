import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine, type EngineSetup } from "#api/engine/testkit/harness";
import "#api/cards/index";
import { compiled } from "#api/cards/SD02/SD02-06";

const cardId = "SD02-06";
const redAlysion = "SD01-02";
const nonAlysion = "BT1-028";
const vanillaLevel5 = "BT1-038";
const vanillaLevel3 = "BT1-028";
const bottomSource = "BT1-003";

type BoardParams = { ownDigimon: string; decline?: boolean };

async function boardWithValner({ ownDigimon, decline = false }: BoardParams) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: cardId, as: "valner" },
          { card: ownDigimon, as: "ownDigimon" },
        ],
      },
      1: { battleArea: [{ card: vanillaLevel5, as: "target", under: [bottomSource, vanillaLevel3] }] },
    },
    decline
      ? { autoSelectCards: true, autoDeclineOptional: true }
      : { autoSelectCards: true, autoAcceptOptional: true },
  );
  await s.ready();
  return s;
}

function activateMain(s: EngineSetup) {
  const entries = JSON.parse(s.perm("valner").activatableEffectsJson || "[]") as { effectKey: string }[];
  if (entries.length === 0) {
    return { ok: false };
  }
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm("valner").topCard.instanceId,
    effectKey: entries[0]!.effectKey,
  });
}

describe("SD02-06 Valner Dragnogh", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD02",
      nameEn: "Valner Dragnogh",
      nameJp: "ヴァルナー・ドラグノフ",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["ALYSION"],
      rarity: "R",
      effectText:
        "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[Main] If you have a Digimon with the [ALYSION] trait, by suspending this Tamer, trash the bottom digivolution card of 1 of your opponent's Digimon.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("compiles the memory floor, the conditional suspend-cost bottom trash and the security play", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "StartOfYourTurn",
        actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2, controller: "mine" } }],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "TrashDigivolution",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: 1,
            fromTop: false,
            condition: {
              kind: "youHave",
              filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
            },
            cost: { kind: "suspend", target: { isSelf: true } },
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
    ]);
  });

  it.each([
    [0, 3],
    [2, 3],
    [3, 3],
    [4, 4],
  ])("at the start of your turn turns %i memory into %i", async (memory, expected) => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "valner" }] } });
    s.state.memory = memory;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("valner"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(expected);
  });

  it("suspends itself to trash the bottom digivolution card of an opposing Digimon with an ALYSION Digimon", async () => {
    const s = await boardWithValner({ ownDigimon: redAlysion });

    expect(activateMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("valner").isSuspended).toBe(true);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual([vanillaLevel3]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([bottomSource]);
    assertNoLoudGap(s);
  });

  it("stays unsuspended and trashes nothing when the suspend cost is declined", async () => {
    const s = await boardWithValner({ ownDigimon: redAlysion, decline: true });

    expect(activateMain(s)).toEqual({ ok: true });
    await drainMicrotasks(40);

    expect(s.perm("valner").isSuspended).toBe(false);
    expect(s.perm("target").stack).toHaveLength(2);
  });

  it("neither suspends nor trashes without an ALYSION Digimon", async () => {
    const s = await boardWithValner({ ownDigimon: nonAlysion });

    activateMain(s);
    await drainMicrotasks(40);

    expect(s.perm("valner").isSuspended).toBe(false);
    expect(s.perm("target").stack).toHaveLength(2);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: cardId, as: "valner", faceUp: true }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("valner"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([cardId]);
    expect(s.state.memory).toBe(0);
  });
});
