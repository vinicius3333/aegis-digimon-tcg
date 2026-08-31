import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-05 Sakuyamon", () => {
  it("plays a Pipe Fox Token from its On Play effect", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST22-05", as: "sakuyamon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakuyamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId.includes("TOKEN")));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId.includes("TOKEN"))).toBe(true);
  });
});
