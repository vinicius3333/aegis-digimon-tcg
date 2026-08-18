import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-071.js";

describe("EX2-071 Death Slinger", () => {
  it("deletes an opposing level-4-or-lower Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: ["EX2-044"], hand: [{ card: "EX2-071", as: "option" }] }, 1: { battleArea: ["EX2-019"] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
