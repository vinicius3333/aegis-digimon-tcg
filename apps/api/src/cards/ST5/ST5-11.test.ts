import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-11.js";

describe("ST5-11 Megadramon", () => {
  it("is fully represented as an inherited Blocker keyword", () => {
    expect(runtimeCompiledCard("ST5-11")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [{ trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker" }] }],
    });
  });

  it("gives its host Blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST5-12", under: ["ST5-11"], as: "host" }], security: ["ST5-03"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("uses inherited Blocker in a real opponent attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST5-12", under: ["ST5-11"], as: "host" }], security: ["ST5-03"] },
        1: { battleArea: [{ card: "ST1-02", as: "attacker" }], security: ["ST5-03"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
