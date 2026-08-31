import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-236.js";

describe("P-236 Glowing Dawn", () => {
  it("requires Glowing Dawn and reveals three cards before placement", () => {
    const effects = runtimeCompiledCard("P-236")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        actions: [
          expect.objectContaining({
            kind: "WaiveColorRequirement",
            condition: expect.objectContaining({ kind: "youHave" }),
          }),
        ],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3 }), { kind: "PlaceInBattleAreaSelf" }],
      }),
    );
  });

  it("gains two memory through Delay", () => {
    expect(runtimeCompiledCard("P-236")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
        actions: [{ kind: "GainMemory", amount: 2 }],
      }),
    );
  });

  it("places itself in the battle area from Security", () => {
    expect(runtimeCompiledCard("P-236")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlaceInBattleAreaSelf" }],
      }),
    );
  });
});
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-236 engine behavior", () => {
  it("adds a Glowing Dawn card from the top three and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-236", as: "dawn" }],
          deck: [{ card: "BT25-032", as: "glowingDawn" }, "BT1-001", "BT1-002"],
          battleArea: ["BT1-088", "BT25-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dawn").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("glowingDawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "P-236")).toBe(true);
  });
});
