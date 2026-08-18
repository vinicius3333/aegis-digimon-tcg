import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-079.js";

describe("BT2-079 VenomMyotismon", () => {
  it("has Security Attack +1 and checks 2 security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-079", as: "venomMyotismon" }] },
      1: { security: ["BT1-010", "BT1-011", "BT1-012"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("venomMyotismon"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("venomMyotismon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("gains 1 memory whenever an opposing Digimon becomes suspended on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-079", as: "venomMyotismon" }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("first").permanentId]);
    expect(s.state.memory).toBe(-1);
    await advance(s.engine).verb.suspend([s.perm("second").permanentId]);

    expect(s.state.memory).toBe(-2);
  });

  it("does not gain memory when its controller's Digimon becomes suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-079", as: "venomMyotismon" },
          { card: "BT2-068", as: "mine" },
        ],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("mine").permanentId]);

    expect(s.state.memory).toBe(0);
  });

  it("does not gain memory when an opposing Digimon becomes suspended during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-079", as: "venomMyotismon" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);

    expect(s.state.memory).toBe(0);
  });
});
