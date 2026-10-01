import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-035.js";

describe("BT5-035 Starmons", () => {
  it("gives -1000 DP for each own Digimon in play, including itself", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT5-035", as: "source" }], battleArea: [{ card: "BT5-034", as: "ally" }] },
        1: {
          battleArea: [
            { card: "BT5-041", as: "target", dp: 7000 },
            { card: "BT5-041", as: "otherTarget", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 5000);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.perm("otherTarget").currentDP).toBe(7000);
  });
});

describe("BT5-035 Starmons — KB Q&A rulings", () => {
  function setupStarmonsBoard(ownBattleArea: { card: string; as: string }[] = []) {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT5-035", as: "starmons" },
            { card: "BT1-009", as: "laterPlay" },
          ],
          battleArea: ownBattleArea,
        },
        1: {
          battleArea: [
            { card: "BT5-041", as: "target", dp: 7000 },
            { card: "BT5-041", as: "otherTarget", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    return s;
  }

  it("counts Starmons itself among your Digimon in play (Q1317)", async () => {
    const s = setupStarmonsBoard();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("starmons").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 6000);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.perm("otherTarget").currentDP).toBe(7000);
  });

  it("gives the whole reduction to only 1 opponent Digimon even with 2 Digimon in play (Q1318)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT5-035", as: "starmons" }],
        battleArea: [{ card: "BT1-009", as: "ally" }],
      },
      1: {
        battleArea: [
          { card: "BT5-041", as: "target", dp: 7000 },
          { card: "BT5-041", as: "otherTarget", dp: 7000 },
        ],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("starmons").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const request = s.decisions.at(-1)!.req;
    const candidates = request.options?.candidateInstanceIds ?? [];
    expect(candidates).toHaveLength(2);
    expect(request.options?.max).toBe(1);

    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: "chooseTargets", instanceIds: candidates },
    });
    await settle(() => s.perm("target").currentDP !== 7000 || s.perm("otherTarget").currentDP !== 7000);
    await settle();

    const opponentDP = [s.perm("target").currentDP, s.perm("otherTarget").currentDP].sort((a, b) => a - b);
    expect(opponentDP).toEqual([5000, 7000]);
  });

  it("does not add more -DP when another Digimon is played after the [On Play] resolved (Q1319)", async () => {
    const s = setupStarmonsBoard();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("starmons").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 6000);
    expect(s.perm("target").currentDP).toBe(6000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("laterPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.perm("otherTarget").currentDP).toBe(7000);
  });
});
