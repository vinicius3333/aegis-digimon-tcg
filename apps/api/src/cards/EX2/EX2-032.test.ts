import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-032.js";
import "./EX2-034.js";

describe("EX2-032 Strikedramon", () => {
  it("adds a black Tamer from the top four when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-030", as: "base" }],
          hand: [{ card: "EX2-032", as: "evolution" }],
          deck: [{ card: "EX2-062", as: "tamer" }, "BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
  });

  it("gains 1 memory from its inherited effect with two black Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-034", as: "host", under: ["EX2-032"] }, "EX2-062", "EX2-063"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(4);
  });

  it("does not gain memory from its inherited effect with fewer than two black Tamers", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-034", as: "host", under: ["EX2-032"] }, "EX2-062"] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(3);
  });
});
