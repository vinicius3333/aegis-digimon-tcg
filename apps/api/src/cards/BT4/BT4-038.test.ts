import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-038.js";

describe("BT4-038 BushiAgumon", () => {
  it("can attack the same turn it is played because it has Rush", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT4-038", as: "bushi" }] }, 1: { security: ["BT1-010"] } });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bushi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-038"));
    const bushi = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT4-038")!;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: bushi.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
  });
});
