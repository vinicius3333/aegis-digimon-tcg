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

  it("trashes two cards when its stack has no Wizardmon or X Antibody card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-078", as: "wizardX", under: ["BT1-009"] }], deck: ["BT1-010", "BT1-011", "BT1-012"] },
    });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wizardX"));
    expect(observe(s.engine).hasKeyword(s.perm("wizardX"), "Blocker")).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-011"]);
  });

  it("trashes two cards from the deck through its inherited attack effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-078"] }], deck: ["BT1-010", "BT1-011", "BT1-012"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-011"]);
  });
});
