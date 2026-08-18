import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-040.js";
import "./BT9-043.js";

describe("BT9 Magnadramon X security loop deck", () => {
  it("recovers, scales both DP channels from an exact X Antibody source, and spends one security to attack twice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-037", as: "angelStack", under: ["BT9-109"] },
          ],
          hand: [
            { card: "BT9-040", as: "angewomonX" },
            { card: "BT9-043", as: "magnadramonX" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: [
            { card: "BT1-012", as: "startingSecurityTop" },
            { card: "BT1-013", as: "startingSecurityBottom" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT2-047", dp: 5000, as: "firstTarget" },
            { card: "BT2-047", dp: 5000, as: "secondTarget" },
          ],
          security: ["BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    const priorDecisionCount = s.decisions.length;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("angelStack").permanentId,
      instanceId: s.inst("angewomonX").instanceId,
    })).toEqual({ ok: true });
    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return s.decisions.length > priorDecisionCount &&
        req?.sourceCardId === "BT9-040" &&
        req.kind === "chooseTargets";
    });

    const securityAttackChoice = s.decisions.at(-1)!.req;
    expect(new Set(securityAttackChoice.options?.candidateInstanceIds)).toEqual(
      new Set([
        s.perm("firstTarget").permanentId,
        s.perm("secondTarget").permanentId,
      ]),
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: securityAttackChoice.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [s.perm("secondTarget").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.security.length === 3 &&
      s.state.pendingDecision === undefined,
    );
    await settle();

    expect(observe(s.engine).keywordAmount(s.perm("firstTarget"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("secondTarget"), "SecurityAttack")).toBe(-1);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("angelStack").permanentId,
      instanceId: s.inst("magnadramonX").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("firstTarget").currentDP === 2000 &&
      s.perm("secondTarget").currentDP === 2000 &&
      observe(s.engine).securityDp(1) === -3000 &&
      s.state.memory === 6,
    );
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.perm("angelStack").stack.some(({ cardId }) => cardId === "BT9-109")).toBe(true);

    const securityMovedToHandId = s.state.players[0]!.security[0]!.instanceId;
    const firstCombatCount = s.events.filter(({ kind }) => kind === "combatResolved").length;
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("angelStack").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.events.filter(({ kind }) => kind === "combatResolved").length > firstCombatCount &&
      !s.perm("angelStack").isSuspended &&
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === securityMovedToHandId),
    );

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("firstTarget").currentDP).toBe(2000);
    expect(observe(s.engine).securityDp(1)).toBe(-3000);

    const decisionCountBeforeSecondAttack = s.decisions.length;
    const secondCombatCount = s.events.filter(({ kind }) => kind === "combatResolved").length;
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("angelStack").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.events.filter(({ kind }) => kind === "combatResolved").length > secondCombatCount &&
      s.state.players[1]!.security.length === 1,
    );

    expect(s.decisions).toHaveLength(decisionCountBeforeSecondAttack);
    expect(s.perm("angelStack").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
