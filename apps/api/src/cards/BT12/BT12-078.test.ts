import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-078.js";

describe("BT12-078 Wizardmon (X Antibody)", () => {
  it("publicly digivolves for 0 from Wizardmon and takes the Blocker replacement", async () => {
    expect(digivolutionRequirementsFor("BT12-078")).toContainEqual({
      names: ["Wizardmon"],
      cost: 0,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-071", as: "wizard" }],
        hand: [{ card: "BT12-078", as: "wizardX" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wizard").permanentId,
        instanceId: s.inst("wizardX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("wizard"), "Blocker"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("wizard").stack.map(({ cardId }) => cardId)).toEqual(["BT2-071"]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("rejects the alternate evolution from a non-Wizardmon level 4", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-076", as: "dober" }], hand: [{ card: "BT12-078", as: "wizardX" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dober").permanentId,
        instanceId: s.inst("wizardX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("gains Blocker instead of milling when Wizardmon is in its stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-078", as: "wizardX", under: ["BT2-071"] }], deck: ["BT1-009", "BT1-010"] },
    });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wizardX"));
    expect(observe(s.engine).hasKeyword(s.perm("wizardX"), "Blocker")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("gains Blocker instead of milling when X Antibody is in its stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-078", as: "wizardX", under: ["BT9-109"] }], deck: ["BT1-009", "BT1-010"] },
    });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wizardX"));
    expect(observe(s.engine).hasKeyword(s.perm("wizardX"), "Blocker")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("trashes two cards when its stack has no Wizardmon or X Antibody card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-078", as: "wizardX", under: ["BT1-009"] }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
    });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wizardX"));
    expect(observe(s.engine).hasKeyword(s.perm("wizardX"), "Blocker")).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-011"]);
  });

  it("trashes two cards from the deck through its inherited attack effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-078"] }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-011"]);
  });

  it("uses its inherited attack mill at most once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-078"] }],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
