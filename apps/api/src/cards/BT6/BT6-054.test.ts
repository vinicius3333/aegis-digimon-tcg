import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-054.js";

describe("BT6-054 AncientTroymon", () => {
  it("suspends up to two opposing non-Blockers when the opponent attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-054", as: "ancient" }] },
        1: {
          battleArea: [
            { card: "BT6-043", as: "attacker" },
            { card: "BT6-045", as: "first" },
            { card: "BT6-047", as: "second" },
          ],
          security: ["BT6-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.phase = "Main" as never;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").isSuspended && s.perm("second").isSuspended);

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
  });

  it("plays a green level 4 Hybrid from hand on deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT6-054", as: "ancient" }], hand: [{ card: "BT6-049", as: "hybrid" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT6-049"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT6-049")).toBe(true);
  });

  it("does not play a green level 4 without the Hybrid form", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT6-054", as: "ancient" }], hand: [{ card: "BT6-048", as: "nonHybrid" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonHybrid").instanceId);
  });
});
