import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-044.js";

describe("BT10-044 Angoramon", () => {
  it("draws only once when its controller plays green Tamers during their turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-044", as: "angoramon" }],
        hand: [
          { card: "BT10-091", as: "firstGreenTamer" },
          { card: "BT10-091", as: "secondGreenTamer" },
        ],
        deck: [
          { card: "BT1-001", as: "firstDraw" },
          { card: "BT1-002", as: "secondDraw" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstGreenTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("firstDraw").instanceId),
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondGreenTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("secondDraw").instanceId)).toBe(
      false,
    );
    assertNoLoudGap(s);
  });

  it("ignores non-green Tamers and green Tamers played by the opponent", async () => {
    const nonGreen = setupEngine({
      0: {
        battleArea: [{ card: "BT10-044", as: "angoramon" }],
        hand: [{ card: "BT1-085", as: "redTamer" }],
        deck: ["BT1-001"],
      },
    });
    nonGreen.state.memory = 10;
    expect(
      nonGreen.engine.applyIntent(0, { type: "playCard", instanceId: nonGreen.inst("redTamer").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => nonGreen.state.pendingDecision === undefined);
    expect(nonGreen.state.players[0]!.hand).toHaveLength(0);

    const opponent = setupEngine({
      0: { battleArea: [{ card: "BT10-044", as: "angoramon" }], deck: ["BT1-001"] },
      1: { hand: [{ card: "BT10-091", as: "greenTamer" }] },
    });
    opponent.state.turnSeat = 1;
    opponent.state.memory = 10;
    expect(
      opponent.engine.applyIntent(1, { type: "playCard", instanceId: opponent.inst("greenTamer").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => opponent.state.pendingDecision === undefined);
    expect(opponent.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(nonGreen);
    assertNoLoudGap(opponent);
  });

  it("its inherited effect draws only for the first opposing suspension on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-054", as: "host", under: ["BT10-044"] }],
        deck: ["BT1-001", "BT1-002"],
      },
      1: {
        battleArea: [
          { card: "BT10-020", as: "firstTarget" },
          { card: "BT10-020", as: "secondTarget" },
        ],
      },
    });

    await advance(s.engine).verb.suspend([s.perm("firstTarget").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("secondTarget").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);

    const offTurn = setupEngine({
      0: {
        battleArea: [{ card: "BT10-054", as: "host", under: ["BT10-044"] }],
        deck: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT10-020", as: "target" }] },
    });
    offTurn.state.turnSeat = 1;
    await advance(offTurn.engine).verb.suspend([offTurn.perm("target").permanentId]);
    expect(offTurn.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
    assertNoLoudGap(offTurn);
  });
});
