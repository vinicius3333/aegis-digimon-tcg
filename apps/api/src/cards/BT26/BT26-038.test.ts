import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { compiled } from "./BT26-038.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
describe("BT26-038 Kuwagamon", () => {
  it("compiles the three suspend-and-buff windows", () => {
    expect(digivolutionRequirementsFor("BT26-038")).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.slice(0, 3).map((e) => e.trigger)).toEqual(["OnPlay", "WhenDigivolving", "WhenMoving"]);
    expect(compiled.effects[0]?.actions).toMatchObject([
      { kind: "Suspend", optional: true },
      { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" },
    ]);
    expect(compiled.effects[3]?.actions).toMatchObject([
      { kind: "SubTrigger", event: "whenBattleWon", sourceFilter: { isSelfRef: true } },
    ]);
  });
  it("gives an eligible Insectoid its temporary DP increase on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-038", as: "kuwagamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "suspendTarget" }] },
      },
      { autoAcceptOptional: true },
    );
    const baseDP = s.perm("kuwagamon").currentDP;

    const resolving = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("kuwagamon"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.perm("suspendTarget").isSuspended).toBe(true);
    expect(s.perm("kuwagamon").currentDP).toBe(baseDP + 3000);
  });

  it("digivolves the battle winner with the inherited one-memory reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-053", as: "winner", dp: 10000, under: ["BT26-038"] },
            { card: "BT1-066", as: "evolutionTarget" },
          ],
          hand: [{ card: "BT26-038", as: "candidate" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    const victimId = s.perm("victim").permanentId;
    const candidateId = s.inst("candidate").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolutionTarget").topCard.cardId === "BT26-038" && !observe(s.engine).isAttacking());

    expect(s.perm("evolutionTarget").topCard.cardId).toBe("BT26-038");
    expect(s.perm("evolutionTarget").topCard.instanceId).toBe(candidateId);
    expect(s.state.memory).toBe(0);
  });

  it("does not trigger the inherited evolution when a different Digimon wins", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-053", as: "host", under: ["BT26-038"] },
            { card: "BT1-066", as: "ally" },
          ],
          hand: [{ card: "BT26-038", as: "candidate" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    const candidateId = s.inst("candidate").instanceId;
    const victimId = s.perm("victim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").topCard.cardId).toBe("BT11-053");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(candidateId);
    expect(s.state.memory).toBe(1);
  });

  it("triggers the inherited evolution after winning against a Security Digimon (Q7020)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-053", as: "winner", dp: 10000, under: ["BT26-038"] },
            { card: "BT1-066", as: "evolutionTarget" },
          ],
          hand: [{ card: "BT26-038", as: "candidate" }],
        },
        1: { security: [{ card: "BT1-009", as: "securityDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    const candidateId = s.inst("candidate").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolutionTarget").topCard.cardId === "BT26-038" && !observe(s.engine).isAttacking());

    expect(s.perm("evolutionTarget").topCard.instanceId).toBe(candidateId);
    expect(s.state.memory).toBe(0);
  });

  it("keeps the Then buff when suspension is declined, and scopes it to own matching traits", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-038", as: "kuwagamon" },
            { card: "BT1-066", as: "insectoid", dp: 2000 },
            { card: "BT1-009", as: "nonMatching", dp: 3000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-066", as: "opponentInsectoid", dp: 2000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("insectoid").permanentId);
    const baseDP = s.perm("insectoid").currentDP;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("kuwagamon"));

    expect(s.perm("opponentInsectoid").isSuspended).toBe(false);
    expect(s.perm("insectoid").currentDP).toBe(baseDP + 3000);
    expect(s.perm("nonMatching").currentDP).toBe(3000);
    expect(s.perm("opponentInsectoid").currentDP).toBe(2000);

    advance(s.engine).ledgers.modifiers.sweep(s.state, "opponentTurnEnd", 1);
    expect(s.perm("insectoid").currentDP).toBe(baseDP);
  });

  it("uses the exact level-3 TS alternate evolution and rejects a non-TS base", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-034", as: "tsBase" }],
        hand: [{ card: "BT26-038", as: "kuwagamon" }],
        deck: ["BT1-001"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("kuwagamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsBase").topCard.cardId === "BT26-038");
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "nonTsBase" }],
        hand: [{ card: "BT26-038", as: "kuwagamon" }],
      },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("nonTsBase").permanentId,
        instanceId: illegal.inst("kuwagamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
