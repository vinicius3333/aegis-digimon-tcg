import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-058.js";

describe("EX2-058 Jeri Kato", () => {
  it("may play Leomon from hand for free on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX2-058", as: "jeri" }, { card: "EX2-017", as: "leomon" }] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jeri").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("leomon").instanceId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("leomon").instanceId)).toBe(true);
  });
});
