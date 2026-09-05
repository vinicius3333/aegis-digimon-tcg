import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-013.js";
import "./EX2-014.js";
import "../BT1/BT1-032.js";

describe("EX2-013 Labramon", () => {
  it("gains 1 memory when its Jamming host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-032", as: "host", under: [{ card: "EX2-013", as: "source" }] }] },
        1: { security: ["BT1-001", "BT1-001"] },
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
    await advance(s.engine).fireForInstance(EffectTiming.OnUseAttack, s.inst("source"));
    expect(s.state.memory).toBe(4);
  });

  it("does not gain memory when its host lacks Jamming", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-014", as: "host", under: ["EX2-013"] }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.memory).toBe(3);
  });
});
