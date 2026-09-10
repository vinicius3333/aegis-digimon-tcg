import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-102.js";

describe("BT1-102 Blade of the True", () => {
  it("encodes Security as activation of the printed Main effect", () => {
    expect(compiled.effects[1]).toEqual({
      trigger: "Security",
      actions: [{ kind: "ActivateMain" }],
      isSecurity: true,
    });
  });

  it("draws 1 for every 2 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-047"],
        hand: [{ card: "BT1-102", as: "option" }],
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("activates the scaled Main draw from security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT1-102", as: "securityOption", faceUp: true }, "BT1-090", "BT1-091", "BT1-092"],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it.each([
    { count: 0, security: [] },
    { count: 1, security: ["BT1-009"] },
  ])("is still used with $count security cards even though it draws nothing (Q966)", async ({ security }) => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-047"],
        hand: [{ card: "BT1-102", as: "option" }],
        security,
        deck: [{ card: "BT1-013", as: "top" }],
      },
    });
    s.state.memory = 2;
    const option = s.inst("option");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((entry) => entry.instanceId === option.instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
