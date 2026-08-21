import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-020.js";

describe("EX8-020", () => {
  it("inherits a once-per-turn draw when attacking with seven or fewer cards in hand", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", value: 7 } }],
    }));
  it("registers the DS trait on live Dolphmon state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-020", as: "dolphmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("dolphmon"), "DS")).toBe(true);
  });
  it("draws when the host attacks with seven or fewer cards in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-020", as: "dolphmon" }] }],
        deck: ["AD1-001"],
      },
    });
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => s.state.players[0]!.hand.length === handBefore + 1);
    expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
  });
});
