import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, settle, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";
import { compiled } from "#api/cards/BD06/BD06-03";

const cardId = "BD06-03";
const alysionHost = "BD06-05";
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

function setupGemmonInHand(options: { autoAcceptOptional?: boolean; autoDeclineOptional?: boolean }) {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: cardId, as: "gemmon" }],
        battleArea: [{ card: vanilla, as: "ownDigimon" }],
      },
      1: { battleArea: [{ card: vanilla, as: "opponentDigimon" }] },
    },
    options,
  );
  s.state.memory = 5;
  return s;
}

describe("BD06-03 Gemmon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD06",
      nameEn: "Gemmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      types: ["Mythical Beast", "ALYSION"],
      effectText: "[On Play] You may suspend 1 Digimon.",
      inheritedEffectText: "[All Turns] This suspended Digimon with the [ALYSION] trait gets +1000 DP.",
    });
  });

  it("compiles the optional On Play suspension and the inherited suspended ALYSION aura", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
            optional: true,
          },
        ],
      },
      {
        trigger: "AllTurns",
        isInherited: true,
        actions: [
          {
            kind: "Aura",
            target: { isSelf: true },
            effect: { kind: "modifyDP", amount: 1000 },
            while: {
              kind: "allOf",
              conditions: [
                { kind: "selfIsSuspended" },
                { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] } },
              ],
            },
          },
        ],
      },
    ]);
  });

  it("suspends the chosen opponent Digimon on play", async () => {
    const s = setupGemmonInHand({ autoAcceptOptional: true });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gemmon").instanceId })).toEqual({
      ok: true,
    });
    await chooseTarget(s, s.perm("opponentDigimon").permanentId);
    await settle(() => s.perm("opponentDigimon").isSuspended);

    expect(s.perm("opponentDigimon").isSuspended).toBe(true);
    expect(s.perm("ownDigimon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("may suspend one of your own Digimon on play", async () => {
    const s = setupGemmonInHand({ autoAcceptOptional: true });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gemmon").instanceId })).toEqual({
      ok: true,
    });
    await chooseTarget(s, s.perm("ownDigimon").permanentId);
    await settle(() => s.perm("ownDigimon").isSuspended);

    expect(s.perm("ownDigimon").isSuspended).toBe(true);
    expect(s.perm("opponentDigimon").isSuspended).toBe(false);
  });

  it("suspends nothing when the On Play effect is declined", async () => {
    const s = setupGemmonInHand({ autoDeclineOptional: true });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gemmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.every((permanent) => !permanent.isSuspended)).toBe(true);
    expect(s.perm("opponentDigimon").isSuspended).toBe(false);
  });

  it("gives +1000 DP only to a suspended ALYSION host, on either player's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: alysionHost, as: "suspendedAlysion", suspended: true, under: [cardId] },
          { card: alysionHost, as: "activeAlysion", under: [cardId] },
          { card: vegetationHost, as: "suspendedVegetation", suspended: true, under: [cardId] },
          { card: cardId, as: "topGemmon", suspended: true },
        ],
      },
    });
    await s.ready();

    expect(s.perm("suspendedAlysion").currentDP).toBe(8000);
    expect(s.perm("activeAlysion").currentDP).toBe(7000);
    expect(s.perm("suspendedVegetation").currentDP).toBe(4000);
    expect(s.perm("topGemmon").currentDP).toBe(1000);

    s.state.turnSeat = 1;
    await advance(s.engine).verb.suspend([s.perm("activeAlysion").permanentId]);
    expect(s.perm("activeAlysion").currentDP).toBe(8000);
    expect(s.perm("suspendedAlysion").currentDP).toBe(8000);

    await advance(s.engine).verb.unsuspend([s.perm("suspendedAlysion").permanentId]);
    expect(s.perm("suspendedAlysion").currentDP).toBe(7000);
    assertNoLoudGap(s);
  });
});
