import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-03.js";

describe("ST5-03 Agumon", () => {
  it("is fully represented as a static Blocker keyword", () => {
    expect(runtimeCompiledCard("ST5-03")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [{ trigger: "Static", keywords: [{ keyword: "Blocker" }] }],
    });
  });

  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST5-03", as: "agumon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("agumon"), "Blocker")).toBe(true);
  });

  it("uses Blocker in a real opponent attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST5-03", as: "blocker" }], security: ["ST5-03"] },
        1: { battleArea: [{ card: "ST1-02", as: "attacker" }], security: ["ST5-03"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const blocker = s.perm("blocker");
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
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(blocker.isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === blocker.topCard.instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
