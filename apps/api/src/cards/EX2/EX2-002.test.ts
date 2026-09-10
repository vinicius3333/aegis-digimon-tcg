import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-002.js";

describe("EX2-002 Xiaomon", () => {
  it("gives only its level-4 host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-015", as: "host", under: ["EX2-002"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("does not boost a host that is not level 4", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-013", as: "host", under: ["EX2-002"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(1000);
  });

  it("keeps the level-4 bonus during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-015", as: "host", under: ["EX2-002"] }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("keeps the inherited bonus after a legal blue level-3-to-4 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-013", as: "host", under: ["EX2-002"] }],
        hand: [{ card: "EX2-015", as: "evolution" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("evolution").instanceId);

    expect(s.perm("host").topCard.cardId).toBe("EX2-015");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX2-002", "EX2-013"]);
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
