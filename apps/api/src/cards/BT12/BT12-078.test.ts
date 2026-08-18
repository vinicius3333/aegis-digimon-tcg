import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-078.js";

describe("BT12-078 Wizardmon (X Antibody)", () => {
  it("gains Blocker instead of milling when Wizardmon is in its stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-078", as: "wizardX", under: ["BT2-071"] }], deck: ["BT1-009", "BT1-010"] },
    });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wizardX"));
    expect(observe(s.engine).hasKeyword(s.perm("wizardX"), "Blocker")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
