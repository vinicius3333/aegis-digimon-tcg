import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-002.js";

describe("EX8-002", () => {
  it("matches the catalog's Digi-Egg identity and inherited text", () =>
    expect(getCardDefinition("EX8-002")).toMatchObject({
      cardId: "EX8-002",
      nameEn: "Bukamon",
      colors: ["Blue"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser", "DS"],
      inheritedEffectText: "[When Attacking] [Once Per Turn] If you have 0 memory, gain 1 memory.",
      evoCosts: [],
    }));

  it("inherits a once-per-turn attack effect that gains 1 memory at exactly 0 memory", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "memoryAtMost", value: 0 },
              { kind: "memoryAtLeast", value: 0 },
            ],
          },
        },
      ],
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

  it("resets its once-per-turn use on the next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-018", as: "host", under: ["EX8-002"], dp: 20_000 }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "firstTarget", suspended: true }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
    });
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await secondTurn;

    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it.each([-1, 1])("does not trigger away from exactly 0 memory (%i)", async (memory) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-002"] }] } });
    await s.ready();
    s.state.memory = memory;
    s.state.phase = Phase.Main;
    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await drainMicrotasks();
    expect(s.state.memory).toBe(memory);
  });
});
