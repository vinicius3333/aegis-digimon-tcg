import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("ST3 vanilla cards", () => {
  it.each([
    ["ST3-02", 2],
    ["ST3-03", 3],
    ["ST3-06", 4],
    ["ST3-10", 10],
  ])("plays %s with its catalog cost and no effect window", async (cardId, cost) => {
    const s = setupEngine({ 0: { hand: [{ card: cardId, as: "vanilla" }] } });
    s.state.memory = cost + 1;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vanilla").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("vanilla").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === cardId)).toBe(true);
  });
});
