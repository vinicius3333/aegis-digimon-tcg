import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-061.js";

describe("BT1-061 Mistymon", () => {
  it("gives two opponent Digimon -3000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-061", as: "mistymon" }] },
        1: {
          battleArea: [
            { card: "BT1-070", as: "targetA", dp: 6000 },
            { card: "BT1-071", as: "targetB", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mistymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("targetA").currentDP === 3000 && s.perm("targetB").currentDP === 4000);

    expect([s.perm("targetA").currentDP, s.perm("targetB").currentDP]).toEqual([3000, 4000]);

    await advance(s.engine).runTurn(0);
    expect([s.perm("targetA").currentDP, s.perm("targetB").currentDP]).toEqual([6000, 7000]);
  });

  it("requires both targets when the opponent controls at least two Digimon (Q920)", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT1-061", as: "mistymon" }] },
      1: { battleArea: ["BT1-070", "BT1-071", "BT1-072"] },
    });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mistymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.decisions.at(-1)?.req.options).toMatchObject({ min: 2, max: 2 });
  });

  it("requires the only available Digimon when the opponent controls one (Q920)", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT1-061", as: "mistymon" }] },
      1: { battleArea: [{ card: "BT1-070", as: "target", dp: 6000 }] },
    });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mistymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.decisions.at(-1)?.req.options).toMatchObject({ min: 1, max: 1 });
  });
});
