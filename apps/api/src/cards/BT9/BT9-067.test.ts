import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-067.js";

describe("BT9-067 Raidenmon", () => {
  it("places Raijinmon, Fujinmon and Suijinmon from trash under itself and gains three memory", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT9-067", as: "source" }], trash: ["BT9-042", "BT9-054", "BT9-029"] } }, { autoSelectCards: true });
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    const source = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT9-067");
    expect(source?.stack.map((c) => c.cardId)).toEqual(expect.arrayContaining(["BT9-042", "BT9-054", "BT9-029"]));
  });
});
