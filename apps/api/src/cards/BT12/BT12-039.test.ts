import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-039.js";
import "./BT12-017.js";

describe("BT12-039 Gokuumon", () => {
  it("has the printed 3-cost evolution route from a level-4 Save-text card", () => {
    expect(digivolutionRequirementsFor("BT12-039")).toContainEqual({
      level: 4,
      texts: ["Save"],
      cost: 3,
      isAlternate: true,
    });
  });

  it("reduces its hand play cost by 3 when the opponent has a Security Attack Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT12-039", as: "goku" }] },
      1: { battleArea: [{ card: "BT12-017", as: "securityAttacker" }] },
    });
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goku").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(7);
  });

  it("pays the full play cost without an opposing Security Attack effect", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT12-039", as: "goku" }] }, 1: { battleArea: ["BT1-009"] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goku").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(4);
  });

  it("inherited attack grants Security Attack -1 through the opponent's turn and only once", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-038", as: "host", under: ["BT12-039"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });
});
