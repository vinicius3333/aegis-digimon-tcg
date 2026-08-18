import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-099.js";

describe("BT2-099 Wyvern's Breath", () => {
  it("reduces its use cost by 1 for each yellow Tamer in play", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-087", "BT1-087"], hand: [{ card: "BT2-099", as: "option" }] }, 1: { battleArea: [{ card: "BT2-050", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT2-099"));
    expect(s.state.memory).toBe(3);
  });

  it("reduces an opposing Digimon by 12000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT2-033", "BT2-087"], hand: [{ card: "BT2-099", as: "option" }] }, 1: { battleArea: [{ card: "BT2-045", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 0);
    expect(s.perm("target").currentDP).toBe(0);
  });
});
