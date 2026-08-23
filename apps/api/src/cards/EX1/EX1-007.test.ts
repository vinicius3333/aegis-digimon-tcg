import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-007.js";

describe("EX1-007 Megadramon", () => {
  it("deletes up to 2 opposing Digimon with 3000 DP or less on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX1-007", as: "megadramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "small1", dp: 3000 },
            { card: "BT1-010", as: "small2", dp: 2000 },
            { card: "BT1-011", as: "large", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 2);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("large").permanentId);
  });

  it("grants inherited Security Attack +1 to a Machine host on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-042", as: "machine", under: ["EX1-007"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("machine"), "SecurityAttack")).toBe(true);
  });
});
