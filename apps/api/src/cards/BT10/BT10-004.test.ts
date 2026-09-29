import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../EX7/EX7-069.js";
import "./BT10-004.js";

describe("BT10-004 Bosamon", () => {
  it("gives its host +1000 DP once per turn when an effect suspends a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "host", under: ["BT10-004"] },
          { card: "BT10-046", as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "BT10-020", as: "opponent" }] },
    });
    const base = s.perm("host").baseDP;
    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    expect(s.perm("host").currentDP).toBe(base + 1000);

    await advance(s.engine).runTurn(0);
    expect(s.perm("host").currentDP).toBe(base);
  });

  it("arms two copies independently without duplicating either watcher on recompute", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "firstHost", under: ["BT10-004"] },
          { card: "BT10-054", as: "secondHost", under: ["BT10-004"] },
          { card: "BT10-046", as: "firstSuspended" },
          { card: "BT10-047", as: "secondSuspended" },
        ],
      },
    });
    const firstBase = s.perm("firstHost").baseDP;
    const secondBase = s.perm("secondHost").baseDP;

    await advance(s.engine).recompute();
    await advance(s.engine).recompute();
    await advance(s.engine).verb.suspend([s.perm("firstSuspended").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("secondSuspended").permanentId]);

    expect(s.perm("firstHost").currentDP).toBe(firstBase + 1000);
    expect(s.perm("secondHost").currentDP).toBe(secondBase + 1000);
  });

  it("does not arm or gain DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "host", under: ["BT10-004"] },
          { card: "BT10-046", as: "ally" },
        ],
      },
    });
    const base = s.perm("host").baseDP;
    s.state.turnSeat = 1;

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);

    expect(s.perm("host").currentDP).toBe(base);
  });
});

describe("BT10-004 Bosamon — KB Q&A rulings", () => {
  it("gives +1000 DP when an effect suspends one of your own Digimon (Q1930)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-069", as: "windSlicer" }],
          battleArea: [
            { card: "BT10-054", as: "host", under: ["BT10-004"] },
            { card: "BT10-047", as: "attacker" },
            { card: "BT10-046", as: "ownDigimon" },
          ],
        },
        1: { security: ["BT10-045"] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    const base = s.perm("host").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
    await settle();
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("host").currentDP).toBe(base);

    const answered = new Set<string>();
    const answerNextTarget = async (permanentId: string): Promise<void> => {
      await settle(() => s.decisions.some(({ req }) => req.kind === "chooseTargets" && !answered.has(req.decisionId)));
      const { req } = s.decisions.find(
        ({ req: request }) => request.kind === "chooseTargets" && !answered.has(request.decisionId),
      )!;
      answered.add(req.decisionId);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "chooseTargets", instanceIds: [permanentId] },
        }),
      ).toEqual({ ok: true });
    };

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("windSlicer").instanceId })).toEqual({
      ok: true,
    });
    await answerNextTarget(s.perm("ownDigimon").permanentId);
    await answerNextTarget(s.perm("attacker").permanentId);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("windSlicer").instanceId));
    await settle();

    expect(s.perm("ownDigimon").isSuspended).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.perm("host").currentDP).toBe(base + 1000);
  });
});
