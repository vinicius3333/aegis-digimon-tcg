import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST1-06.js";

describe("ST1-06 Coredramon", () => {
  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-06", as: "coredramon" }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("coredramon"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("coredramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("finishes the attack after losing 2 moves memory to the opponent's side (Q602)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-06", as: "coredramon" }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("coredramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(-1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
