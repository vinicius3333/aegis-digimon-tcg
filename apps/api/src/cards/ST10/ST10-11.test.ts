import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST10-11.js";

describe("ST10-11 Bastemon", () => {
  it("deletes an opposing level 3 Digimon on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST10-11", as: "bastemon" }] }, 1: { battleArea: [{ card: "ST10-07", as: "target" }] } },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard.instanceId;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bastemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === targetId)).toBe(true);
  });

  it("does not delete an opposing level 4 Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST10-11", as: "bastemon" }] },
        1: { battleArea: [{ card: "ST10-10", as: "level4" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    const targetId = s.perm("level4").topCard.instanceId;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bastemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.instanceId).toBe(targetId);
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === targetId)).toBe(false);
  });
});
