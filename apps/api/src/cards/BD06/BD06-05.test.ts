import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";
import { compiled } from "#api/cards/BD06/BD06-05";

const cardId = "BD06-05";
const silvamon = "BD06-06";
const vegetationHost = "BT1-065";
const vanilla = "BT1-009";

type Harness = ReturnType<typeof setupEngine>;

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
}

function activateMain(s: Harness) {
  const effect = observe(s.engine).activatableEffects(s.perm("highElfmon"))[0];
  expect(effect).toBeDefined();
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm("highElfmon").topCard.instanceId,
    effectKey: effect!.effectKey,
  });
}

function setupMainBoard(options: { autoAcceptOptional?: boolean; autoDeclineOptional?: boolean }) {
  return setupEngine(
    {
      0: {
        battleArea: [
          { card: cardId, as: "highElfmon" },
          { card: vanilla, as: "ownDigimon" },
        ],
      },
      1: {
        battleArea: [
          { card: vanilla, as: "opponentA" },
          { card: vanilla, as: "opponentB" },
        ],
      },
    },
    options,
  );
}

describe("BD06-05 HighElfmon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD06",
      nameEn: "HighElfmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      types: ["Fairy", "ALYSION"],
      effectText: "[Main][Once Per Turn] By suspending 1 of your Digimon, suspend 1 of your opponent's Digimon.",
      inheritedEffectText:
        "[Your Turn] This Digimon with the [ALYSION] trait gains ＜Piercing＞. (When this Digimon attacks and deletes your opponent's Digimon in battle, it checks security before the attack ends.)",
    });
  });

  it("compiles the once-per-turn Main suspension cost and the inherited ALYSION Piercing", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Main",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            cost: { kind: "suspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "Aura",
            target: { isSelf: true },
            effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
            while: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] } },
          },
        ],
      },
    ]);
  });

  it("suspends another of your Digimon to suspend the chosen opponent Digimon, once per turn", async () => {
    const s = setupMainBoard({ autoAcceptOptional: true });
    await s.ready();

    expect(activateMain(s)).toEqual({ ok: true });
    await chooseTarget(s, s.perm("ownDigimon").permanentId);
    await chooseTarget(s, s.perm("opponentB").permanentId);
    await settle(() => s.perm("opponentB").isSuspended);
    await drainMicrotasks(20);

    expect(s.perm("ownDigimon").isSuspended).toBe(true);
    expect(s.perm("highElfmon").isSuspended).toBe(false);
    expect(s.perm("opponentB").isSuspended).toBe(true);
    expect(s.perm("opponentA").isSuspended).toBe(false);
    expect(observe(s.engine).activatableEffects(s.perm("highElfmon"))).toEqual([]);
    assertNoLoudGap(s);
  });

  it("may pay the cost by suspending HighElfmon itself", async () => {
    const s = setupMainBoard({ autoAcceptOptional: true });
    await s.ready();

    expect(activateMain(s)).toEqual({ ok: true });
    await chooseTarget(s, s.perm("highElfmon").permanentId);
    await chooseTarget(s, s.perm("opponentA").permanentId);
    await settle(() => s.perm("opponentA").isSuspended);

    expect(s.perm("highElfmon").isSuspended).toBe(true);
    expect(s.perm("ownDigimon").isSuspended).toBe(false);
    expect(s.perm("opponentA").isSuspended).toBe(true);
  });

  it("suspends nothing when the cost is declined", async () => {
    const s = setupMainBoard({ autoDeclineOptional: true });
    await s.ready();

    expect(activateMain(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks(20);

    expect(s.state.players[0]!.battleArea.every((permanent) => !permanent.isSuspended)).toBe(true);
    expect(s.state.players[1]!.battleArea.every((permanent) => !permanent.isSuspended)).toBe(true);
  });

  it("grants inherited Piercing only to an ALYSION host during your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: silvamon, as: "alysionHost", under: [cardId] },
          { card: vegetationHost, as: "vegetationHost", under: [cardId] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("alysionHost"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("vegetationHost"))).toBe(false);

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: silvamon, as: "alysionHost", under: [cardId] }] } });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(observe(opponentTurn.engine).hasPierce(opponentTurn.perm("alysionHost"))).toBe(false);
  });

  it("checks security after the ALYSION host deletes a Digimon in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: silvamon, as: "attacker", under: [cardId] }] },
        1: {
          battleArea: [{ card: vanilla, as: "victim", suspended: true }],
          security: [vanilla, vanilla],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([silvamon]);
  });
});
