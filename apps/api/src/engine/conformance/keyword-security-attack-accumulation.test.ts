import { beforeEach, describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

describe("Security Attack accumulation", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0221",
      "16-4: Security A. modifies the number of security cards checked",
      "55384b63f06da1dcfb1db09e34a8e69e7f9ce2b89422114c9294c2412c57b502",
    );
    cite(
      "comprehensive-0222",
      "16-4-3/16-4-4: independent Security A. instances modify checks additively and clamp negative results at zero",
      "471c3ca2923b2e688ac6e53edb3789646e7d01b6cb0be7e736fd3a3d2b82d60e",
    );
  });

  it("combines WarGreymon's public +1 with ST1-07's inherited +1 for three exact checks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", under: ["ST1-07"], as: "base" }],
        hand: [
          { card: "BT1-021", as: "metalgreymon" },
          { card: "BT1-025", as: "wargreymon" },
        ],
        deck: ["BT1-010", "BT1-012"],
      },
      1: {
        security: [
          { card: "BT1-009", as: "security1" },
          { card: "BT1-010", as: "security2" },
          { card: "BT1-011", as: "security3" },
        ],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    await s.ready();
    s.state.memory = 6;
    const host = s.perm("base");
    const securityIds = ["security1", "security2", "security3"].map((alias) => s.inst(alias).instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("metalgreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard.instanceId === s.inst("metalgreymon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("wargreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard.instanceId === s.inst("wargreymon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(["ST1-07", "BT1-014", "BT1-021"]);
    expect(host.topCard.cardId).toBe("BT1-025");
    expect(observe(s.engine).keywordAmount(host, "SecurityAttack")).toBe(2);

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: host.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0, 5000);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(securityIds);
    expect(host.topCard.instanceId).toBe(s.inst("wargreymon").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(host.topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(observe(s.engine).keywordAmount(host, "SecurityAttack")).toBe(1);
  });
});
