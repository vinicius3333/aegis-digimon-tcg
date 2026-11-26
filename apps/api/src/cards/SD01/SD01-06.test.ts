import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, settle, setupEngine, type PermanentSpec } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";
import { compiled } from "#api/cards/SD01/SD01-06";

const cardId = "SD01-06";
const reptilimon = "SD01-04";
const gemmon = "SD01-02";
const blueAlysion = "SD02-03";
const nonAlysionLevel5 = "BT1-020";
const vanillaRedLevel3 = "BT1-009";

async function attackPlayerWith(attacker: PermanentSpec, opponentDp: readonly number[]) {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: cardId, as: "kanata" }, attacker] },
      1: {
        battleArea: opponentDp.map((dp, index) => ({ card: vanillaRedLevel3, as: `target${index}`, dp })),
        security: [vanillaRedLevel3, vanillaRedLevel3, vanillaRedLevel3],
      },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
  return s;
}

describe("SD01-06 Kanata Hondo", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD01",
      nameEn: "Kanata Hondo",
      nameJp: "本堂カナタ",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["ALYSION"],
      rarity: "R",
      effectText:
        "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[Your Turn] Add 2000 to your [ALYSION] trait Digimon's DP deletion effects' maximums.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("compiles the memory floor, the ALYSION-only deletion maximum and the security play", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "StartOfYourTurn",
        actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2, controller: "mine" } }],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "DeletionMaxDpModifier",
            amount: 2000,
            scope: "owner",
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
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
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "kanata" }] } });
    s.state.memory = memory;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kanata"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(expected);
  });

  it("raises the maximum only for your ALYSION Digimon of any color, not owner-wide or for other Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "kanata" },
          { card: gemmon, as: "redAlysion" },
          { card: blueAlysion, as: "blueAlysion" },
          { card: nonAlysionLevel5, as: "nonAlysion" },
        ],
      },
      1: { battleArea: [{ card: gemmon, as: "opponentAlysion" }] },
    });
    await s.ready();

    expect(s.engine.deletionMaxDp.bonusFor(0, s.perm("redAlysion").permanentId)).toBe(2000);
    expect(s.engine.deletionMaxDp.bonusFor(0, s.perm("blueAlysion").permanentId)).toBe(2000);
    expect(s.engine.deletionMaxDp.bonusFor(0, s.perm("nonAlysion").permanentId)).toBe(0);
    expect(s.engine.deletionMaxDp.bonusFor(0, s.perm("kanata").permanentId)).toBe(0);
    expect(s.engine.deletionMaxDp.bonusFor(0)).toBe(0);
    expect(s.engine.deletionMaxDp.bonusFor(1, s.perm("opponentAlysion").permanentId)).toBe(0);
  });

  it("raises Reptilimon's 4000 DP deletion to 6000: a 6000 DP Digimon is deleted and a 7000 DP one is not", async () => {
    const s = await attackPlayerWith({ card: reptilimon, as: "attacker" }, [7000, 6000]);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("target0").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("target1").instanceId);
    assertNoLoudGap(s);
  });

  it("does not raise the maximum during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "kanata" },
          { card: gemmon, as: "redAlysion" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.engine.deletionMaxDp.bonusFor(0, s.perm("redAlysion").permanentId)).toBe(0);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: cardId, as: "kanata", faceUp: true }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("kanata"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([cardId]);
    expect(s.state.memory).toBe(0);
  });
});
