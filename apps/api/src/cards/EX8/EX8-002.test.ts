import { describe, expect, it } from "vitest";
import { Phase, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-002.js";

describe("EX8-002", () => {
  it("inherits a once-per-turn attack effect that gains 1 memory at exactly 0 memory", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "allOf" } }],
    }));

  it("gains 1 memory at exactly 0 only once per turn in a legal DS evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-018", as: "host", under: ["EX8-002"], dp: 20_000 }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "target1", suspended: true },
          { card: "BT1-010", as: "target2", suspended: true },
        ],
      },
    });
    await s.ready();
    s.state.memory = 0;
    const attack = (target: "target1" | "target2") =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm(target).permanentId },
      });

    expect(attack("target1")).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    s.state.memory = 0;
    expect(attack("target2")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(0);
  });

  it.each([-1, 1])("does not trigger away from exactly 0 memory (%i)", async (memory) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-002"] }] } });
    await s.ready();
    s.state.memory = memory;
    s.state.phase = Phase.Main;
    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.memory !== memory);
    expect(s.state.memory).toBe(memory);
  });
});
