import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";
import { compiled } from "#api/cards/BD06/BD06-09";

const cardId = "BD06-09";
const greenAlysion = "BD06-05";
const greenVegetation = "BT1-065";
const redAlysion = "BD01-02";
const vanilla = "BT1-009";

const alysionTrait = [{ tokens: ["ALYSION"], match: "trait" }];

async function memoryAtMainPhaseWith(digimon: readonly string[]) {
  const s = setupEngine({
    0: {
      battleArea: [{ card: cardId, as: "kanata" }, ...digimon.map((card, index) => ({ card, as: `digimon${index}` }))],
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

describe("BD06-09 Kanata Hondo", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD06",
      nameEn: "Kanata Hondo",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["ALYSION"],
      effectText:
        "[Start of Your Main Phase] If you have a green Digimon with the [ALYSION] trait, gain 1 memory.\n[All Turns] All of your suspended green Digimon with the [ALYSION] trait get +1000 DP.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
  });

  it("compiles the memory gain, the suspended green ALYSION aura, and the Security play", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            condition: {
              kind: "youHave",
              filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Green"], nameOrTrait: alysionTrait },
            },
          },
        ],
      },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Aura",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Green"],
                suspended: true,
                nameOrTrait: alysionTrait,
              },
              count: "all",
            },
            effect: { kind: "modifyDP", amount: 1000 },
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, isSelf: true }, payCost: false }],
      },
    ]);
  });

  it("gains 1 memory at the start of the main phase with a green ALYSION Digimon", async () => {
    expect(await memoryAtMainPhaseWith([greenAlysion])).toBe(4);
  });

  it("gains no memory with only a green non-ALYSION Digimon and a red ALYSION Digimon", async () => {
    expect(await memoryAtMainPhaseWith([greenVegetation, redAlysion])).toBe(3);
  });

  it("gives +1000 DP on either player's turn only to your suspended green ALYSION Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "kanata" },
          { card: greenAlysion, as: "suspendedGreenAlysion", suspended: true },
          { card: greenAlysion, as: "activeGreenAlysion" },
          { card: greenVegetation, as: "suspendedGreenVegetation", suspended: true },
          { card: redAlysion, as: "suspendedRedAlysion", suspended: true },
        ],
      },
      1: { battleArea: [{ card: greenAlysion, as: "opponentGreenAlysion", suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.perm("suspendedGreenAlysion").currentDP).toBe(8000);
    expect(s.perm("activeGreenAlysion").currentDP).toBe(7000);
    expect(s.perm("suspendedGreenVegetation").currentDP).toBe(4000);
    expect(s.perm("suspendedRedAlysion").currentDP).toBe(2000);
    expect(s.perm("opponentGreenAlysion").currentDP).toBe(7000);

    await advance(s.engine).verb.suspend([s.perm("activeGreenAlysion").permanentId]);
    expect(s.perm("activeGreenAlysion").currentDP).toBe(8000);
    assertNoLoudGap(s);
  });

  it("plays itself without paying the cost when revealed as a security card", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: cardId, as: "kanata" }] },
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
