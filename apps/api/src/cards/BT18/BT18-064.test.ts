import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-064.js";

describe("BT18-064 Mercurymon", () => {
  it("prevents opponent effects from returning itself to hand or deck after play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT18-064", as: "mercurymon" }] } });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mercurymon").instanceId })).toEqual({ ok: true });
    const mercurymon = () => s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-064")!;
    await settle(() => observe(s.engine).isRestricted(mercurymon(), "beReturned"));

    expect(observe(s.engine).isRestricted(mercurymon(), "beReturned")).toBe(true);
  });
});
