import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX4-068.js";

async function chooseOpponent(s: ReturnType<typeof setupEngine>, alias: string, previousId?: string): Promise<string> {
  await settle(
    () =>
      s.state.pendingDecision?.kind === "chooseTargets" &&
      (previousId === undefined || s.state.pendingDecision.decisionId !== previousId),
  );
  const decision = s.state.pendingDecision!;
  const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
  expect(request.options?.candidateInstanceIds).toContain(s.perm(alias).permanentId);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm(alias).permanentId] },
    }),
  ).toEqual({ ok: true });
  return decision.decisionId;
}

describe("EX4-068 Heaven's Judgement", () => {
  it("matches the catalog, full IR, distinct-color repeat and Security effect", () => {
    expect(getCardDefinition("EX4-068")).toMatchObject({
      nameEn: "Heaven's Judgement",
      colors: ["Yellow"],
      kinds: ["Option"],
      playCost: 7,
      effectText:
        "While you have a green Digimon or Tamer in play, you may use this card without meeting its color requirements. [Main] Activate the effect below. For each color your Digimon have, activate it again. ・1 of your opponent's Digimon gets -6000 DP for the turn.",
      securityEffectText: "[Security] 1 of your opponent's Digimon gets -12000 DP for the turn.",
    });
    expect(runtimeCompiledCard("EX4-068")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Static",
          actions: [
            {
              kind: "WaiveColorRequirement",
              condition: {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Digimon", "Tamer"],
                  colors: ["Green"],
                },
              },
            },
          ],
        },
        {
          trigger: "Main",
          actions: [
            {
              kind: "RepeatPerCount",
              countSource: "distinctOwnDigimonColors",
              countScaling: { per: 1, filter: { controller: "mine", kind: ["Digimon"] }, unit: "colors" },
              action: {
                kind: "ModifyDP",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                amount: -6000,
                duration: "forTheTurn",
              },
            },
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -6000,
              duration: "forTheTurn",
            },
          ],
        },
        {
          trigger: "Security",
          isSecurity: true,
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -12000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    });
  });

  it("publicly chooses a different target for each of its three activations with one two-color Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-041", as: "twoColors" }],
          hand: [{ card: "EX4-068", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 30000 },
            { card: "BT1-010", as: "second", dp: 30000 },
            { card: "BT1-011", as: "third", dp: 30000 },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });

    let lastDecisionId: string | undefined;
    for (const alias of ["first", "second", "third"]) {
      lastDecisionId = await chooseOpponent(s, alias, lastDecisionId);
    }
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT8-041");
    for (const alias of ["first", "second", "third"]) {
      expect(s.perm(alias).currentDP).toBe(24000);
    }
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("option").instanceId }),
    );
  });

  it("waives the yellow color requirement with a green Digimon and counts distinct Digimon colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-025", as: "threeColors" },
            { card: "BT1-009", as: "duplicateRed" },
            { card: "BT1-088", as: "greenTamer" },
          ],
          hand: [{ card: "EX4-068", as: "option" }],
        },
        1: { battleArea: [{ card: "AD1-025", as: "target", dp: 30000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 6000);

    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.state.memory).toBe(3);
  });

  it("rejects use without a green Digimon or Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "red" }], hand: [{ card: "EX4-068", as: "option" }] },
        1: { battleArea: [{ card: "BT1-013", as: "target", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId }).ok).toBe(false);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("applies Security's -12000 during a real opponent attack", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX4-068", as: "securityOption" }], deck: ["BT1-010", "BT1-011", "BT1-012"] },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 30000 }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("securityOption").instanceId) &&
        s.perm("attacker").currentDP === 18000,
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("attacker").currentDP).toBe(18000);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
