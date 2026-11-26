import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";
import { compiled } from "#api/cards/SD03/SD03-06";

const cardId = "SD03-06";
const redAlysion = "BD01-02";
const greenVegetation = "BT1-065";
const vanilla = "BT1-009";

type Harness = ReturnType<typeof setupEngine>;
type MainBoardParams = { ownDigimon: readonly string[]; autoDeclineOptional?: boolean };

function setupMainBoard({ ownDigimon, autoDeclineOptional }: MainBoardParams) {
  return setupEngine(
    {
      0: {
        battleArea: [{ card: cardId, as: "kanata" }, ...ownDigimon.map((card, index) => ({ card, as: `own${index}` }))],
      },
      1: {
        battleArea: [
          { card: vanilla, as: "opponentA" },
          { card: vanilla, as: "opponentB" },
        ],
      },
    },
    autoDeclineOptional === true ? { autoDeclineOptional: true } : { autoAcceptOptional: true },
  );
}

function activateMain(s: Harness) {
  const effect = observe(s.engine).activatableEffects(s.perm("kanata"))[0];
  expect(effect).toBeDefined();
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm("kanata").topCard.instanceId,
    effectKey: effect!.effectKey,
  });
}

async function chooseTarget(s: Harness, permanentId: string) {
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  const decision = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [permanentId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.decisionId !== decision.decisionId);
}

describe("SD03-06 Kanata Hondo", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD03",
      nameEn: "Kanata Hondo",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["ALYSION"],
      effectText:
        "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[Main] By suspending this Tamer and 1 of your Digimon with the [ALYSION] trait, suspend 1 of your opponent's Digimon.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("compiles the memory floor, the two-part suspension cost, and the Security play", () => {
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
            kind: "Suspend",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            cost: {
              kind: "compound",
              costs: [
                { kind: "suspend", target: { isSelf: true } },
                {
                  kind: "suspend",
                  target: {
                    filter: {
                      controller: "mine",
                      kind: ["Digimon"],
                      nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }],
                    },
                    count: 1,
                  },
                },
              ],
            },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlayWithoutCost", target: { isSelf: true }, payCost: false }],
      },
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

  it("suspends itself and an ALYSION Digimon of any color to suspend the chosen opponent Digimon", async () => {
    const s = setupMainBoard({ ownDigimon: [redAlysion, redAlysion, greenVegetation] });
    await s.ready();

    expect(activateMain(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(JSON.parse(s.state.pendingDecision!.payloadJson).candidateInstanceIds).toEqual([
      s.perm("own0").permanentId,
      s.perm("own1").permanentId,
    ]);
    await chooseTarget(s, s.perm("own1").permanentId);
    await chooseTarget(s, s.perm("opponentB").permanentId);
    await settle(() => s.perm("opponentB").isSuspended);
    await drainMicrotasks(20);

    expect(s.perm("kanata").isSuspended).toBe(true);
    expect(s.perm("own1").isSuspended).toBe(true);
    expect(s.perm("own0").isSuspended).toBe(false);
    expect(s.perm("own2").isSuspended).toBe(false);
    expect(s.perm("opponentA").isSuspended).toBe(false);
    expect(observe(s.engine).activatableEffects(s.perm("kanata"))).toEqual([]);
    assertNoLoudGap(s);
  });

  it("suspends nothing without an unsuspended ALYSION Digimon to pay with", async () => {
    const s = setupMainBoard({ ownDigimon: [greenVegetation] });
    await s.ready();

    expect(observe(s.engine).activatableEffects(s.perm("kanata"))).toEqual([]);
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks(20);

    expect(s.state.players[1]!.battleArea.every((permanent) => !permanent.isSuspended)).toBe(true);
    expect(s.perm("own0").isSuspended).toBe(false);
    expect(s.perm("kanata").isSuspended).toBe(false);
  });

  it("suspends nothing when declined", async () => {
    const s = setupMainBoard({ ownDigimon: [redAlysion], autoDeclineOptional: true });
    await s.ready();

    expect(activateMain(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks(20);

    expect(s.state.players[0]!.battleArea.every((permanent) => !permanent.isSuspended)).toBe(true);
    expect(s.state.players[1]!.battleArea.every((permanent) => !permanent.isSuspended)).toBe(true);
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

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBeforeAttack);
  });
});
