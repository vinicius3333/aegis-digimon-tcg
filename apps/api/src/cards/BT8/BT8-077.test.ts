import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-077.js";

describe("BT8-077 BlackGatomon", () => {
  it("can attack on the turn it is played because it has Rush", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT8-073"], hand: [{ card: "BT8-077", as: "gatomon" }] }, 1: { security: ["BT8-034"] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("gatomon").instanceId));
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("gatomon").instanceId)!;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: played.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
  });

  it("grants Retaliation as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-079", as: "host", under: ["BT8-077"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });
});
