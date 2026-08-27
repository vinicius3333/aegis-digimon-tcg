import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-072.js";
import "./BT1-079.js";

describe("BT1-079 Lillymon", () => {
  it("suspends an opposing Digimon without Blocker when its Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-081", as: "attacker", under: ["BT1-079"] }] },
        1: { battleArea: [{ card: "BT1-016", as: "target" }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("excludes an opposing Digimon with Blocker from the target choice", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-081", as: "attacker", under: ["BT1-079"] }] },
      1: {
        battleArea: [
          { card: "BT1-072", as: "blocker" },
          { card: "BT1-016", as: "eligible" },
        ],
        security: ["BT1-010"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    if (decision.kind !== "chooseTargets" || decision.options === undefined)
      throw new Error("Expected target decision");

    expect(decision.options.candidateInstanceIds).toEqual([s.perm("eligible").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("eligible").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("eligible").isSuspended);

    expect(s.perm("eligible").isSuspended).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });

  it("does not target an opposing Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-081", as: "attacker", under: ["BT1-079"] }] },
        1: { battleArea: [{ card: "BT1-085", as: "tamer" }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("tamer").isSuspended).toBe(false);
  });

  it("does not apply while Lillymon is the top card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-079", as: "attacker" }] },
        1: { battleArea: [{ card: "BT1-016", as: "target" }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("target").isSuspended).toBe(false);
  });
});
