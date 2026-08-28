import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-079.js";
describe("BT10-079 Sandiramon", () =>
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-079")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Purple"], 5, 5, 6000, undefined]);
  }));

describe("BT10-079 Sandiramon ordinary lifecycle", () => {
  it("plays for 5 and evolves from a purple level 4 for 2 without an effect window", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-074", as: "base" }],
        hand: [{ card: "BT10-079", as: "evolving" }, { card: "BT10-079", as: "played" }],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-079");
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT10-074"]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
