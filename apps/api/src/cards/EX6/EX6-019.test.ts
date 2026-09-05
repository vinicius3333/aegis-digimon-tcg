import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-019.js";

describe("EX6-019 Angemon", () => {
  it("has Barrier and inherits once-per-turn conditional draw", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Barrier");
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "selfHasTrait" } }],
    });
  });

  it("exposes Barrier on top and draws when an Angel-trait host attacks", async () => {
    const top = setupEngine({ 0: { battleArea: [{ card: "EX6-019", as: "angemon" }] } });
    await top.ready();
    expect(observe(top.engine).hasKeyword(top.perm("angemon"), "Barrier")).toBe(true);

    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-019"] }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(false);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("does not draw from the inherited effect on a non-Angel host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX6-019"] }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(false);
  });
});
