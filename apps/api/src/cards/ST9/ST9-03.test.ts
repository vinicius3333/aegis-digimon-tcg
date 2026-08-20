import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("ST9-03 Betamon", () => {
  it("plays as the catalog-defined vanilla blue Rookie", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST9-03", as: "betamon" }] } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("betamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.perm("betamon")).toMatchObject({ baseDP: 4000, currentDP: 4000, topCard: { cardId: "ST9-03" } });
  });
});
