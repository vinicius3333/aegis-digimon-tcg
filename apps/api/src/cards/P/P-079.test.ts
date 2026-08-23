import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-079.js";

describe("P-079 Agumon", () => {
  it("deletes only a 3000-DP-or-less target with a red Tamer", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-079", as: "source" }], battleArea: [{ card: "BT1-085", as: "tamer" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "eligible", dp: 3000 },
            { card: "BT1-009", as: "too-large", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const eligibleId = s.perm("eligible").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === eligibleId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === eligibleId)).toBe(false);
    expect(s.perm("too-large").currentDP).toBe(4000);
  });

  it("does not delete without a red Tamer", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-079", as: "source" }], battleArea: [{ card: "BT1-086", as: "blue-tamer" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });
});
