import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT18-074.js";

describe("BT18-074 AncientWisemon", () => {
  it("reveals three and plays exactly one eligible black card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-074", as: "ancient" }], deck: ["BT10-022", "BT1-030", "BT1-028"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-022"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-022")).toBe(true);
    const effect = runtimeCompiledCard("BT18-074")!.effects[0]!;
    expect(effect.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "trash" });
  });
});
