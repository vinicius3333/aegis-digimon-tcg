import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-055.js";

describe("BT1-055 Angemon", () => {
  it("gives one opponent Digimon -3000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-055", as: "angemon" }] },
        1: { battleArea: [{ card: "BT1-070", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);

    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("deletes an opposing Digimon reduced to 0 DP by the On Play effect", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-055", as: "angemon" }] },
        1: { battleArea: [{ card: "BT1-054", as: "target", dp: 3000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const targetInstanceId = s.perm("target").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });

  it("resolves without a target when the opponent controls no Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-055", as: "angemon" }] } });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
  });
});
