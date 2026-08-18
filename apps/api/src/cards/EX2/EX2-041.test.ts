import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-041.js";

describe("EX2-041 Dobermon", () => {
  it("costs 2 less to play while Alice McCoy is in play", async () => {
    const s = setupEngine({ 0: { battleArea: ["EX2-064"], hand: [{ card: "EX2-041", as: "dobermon" }] } }, { autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dobermon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-041"));
    expect(s.state.memory).toBe(5);
  });
});
