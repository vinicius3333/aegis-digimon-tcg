import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-001 Tokomon", () => {
  it("draws only once per turn when its TS evolution host attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-012", as: "host", under: ["BT25-001"] }],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });

  it("does not draw when its evolution host lacks the TS trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT25-001"] }],
        deck: ["BT1-001"],
      },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
