import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-096.js";

describe("BT5-096 Supreme Cannon", () => {
  it("binds mutually exclusive branches and explicitly trashes their sources before returning them", () => {
    const main = runtimeCompiledCard("BT5-096")!.effects.find((effect) => effect.trigger === "Main")!;
    expect(main.actions.map((action) => action.kind)).toEqual([
      "SelectBind",
      "TrashDigivolution",
      "Return",
      "SelectBind",
      "TrashDigivolution",
      "Return",
    ]);
    expect(main.actions[0]).toMatchObject({
      target: { count: "all", bindAs: "normalReturnTargets" },
      condition: { kind: "youHaveNone" },
    });
    expect(main.actions[1]).toMatchObject({
      target: { count: "all", fromSelectionRef: "normalReturnTargets" },
      amount: 99,
    });
    expect(main.actions[2]).toMatchObject({
      target: { count: "all", fromSelectionRef: "normalReturnTargets" },
      to: "hand",
    });
    expect(main.actions[3]).toMatchObject({
      target: { count: "all", bindAs: "upgradedReturnTargets" },
      condition: { kind: "youHave" },
    });
    expect(main.actions[4]).toMatchObject({
      target: { count: "all", fromSelectionRef: "upgradedReturnTargets" },
      amount: 99,
    });
    expect(main.actions[5]).toMatchObject({
      target: { count: "all", fromSelectionRef: "upgradedReturnTargets" },
      to: "hand",
    });
  });

  it("returns all 3000-DP-or-less opponents and trashes their sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT5-020", { card: "BT5-021", as: "ownTarget", dp: 3000, under: [{ card: "BT5-001" }] }],
          hand: [{ card: "BT5-096", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT5-021", as: "first", dp: 3000, under: [{ card: "BT5-001", as: "source" }] },
            { card: "BT5-022", as: "high", dp: 4000 },
            { card: "BT5-024", as: "opponentGarurumon", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const firstTopId = s.perm("first").topCard.instanceId;
    const opponentGarurumonId = s.perm("opponentGarurumon").topCard.instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === firstTopId));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual(
      expect.arrayContaining([s.inst("high").instanceId, opponentGarurumonId]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("ownTarget").instanceId)).toBe(
      true,
    );
  });

  it("raises the threshold to 5000 and trashes every returned source when you control Garurumon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-024"], hand: [{ card: "BT5-096", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT5-021", as: "low", dp: 3000, under: [{ card: "BT5-001", as: "lowSource" }] },
            { card: "BT5-022", as: "target", dp: 5000, under: [{ card: "BT5-002", as: "highSource" }] },
            { card: "BT5-046", as: "aboveCap", dp: 5001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const lowTopId = s.perm("low").topCard.instanceId;
    const targetTopId = s.perm("target").topCard.instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetTopId));
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([lowTopId, targetTopId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("lowSource").instanceId, s.inst("highSource").instanceId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.instanceId).toBe(s.inst("aboveCap").instanceId);
  });

  it("activates the threshold logic from security", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT5-024"], security: [{ card: "BT5-096", as: "securityOption", faceUp: true }] },
      1: { battleArea: [{ card: "BT5-022", as: "target", dp: 5000 }] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
