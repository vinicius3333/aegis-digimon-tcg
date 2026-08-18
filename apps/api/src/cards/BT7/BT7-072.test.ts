import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-072.js";

describe("BT7-072 Eyesmon", () => {
  it("plays itself when discarded by an effect together with Eyesmon: Scatter Mode", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-072", as: "eyesmon" }, { card: "BT7-069", as: "scatter" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("eyesmon").instanceId, s.inst("scatter").instanceId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("eyesmon").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("scatter").instanceId)).toBe(true);
  });
});
