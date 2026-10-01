import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-072.js";

describe("BT7-072 Eyesmon", () => {
  it("plays itself when discarded by an effect together with Eyesmon: Scatter Mode", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-072", as: "eyesmon" },
            { card: "BT7-069", as: "scatter" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("eyesmon").instanceId, s.inst("scatter").instanceId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("eyesmon").instanceId,
      ),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("scatter").instanceId)).toBe(true);
  });
});

describe("BT7-072 Eyesmon — KB Q&A rulings", () => {
  it("plays itself when an effect trashes it together with Eyesmon: Scatter Mode from hand (Q1633)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-072", as: "eyesmon" },
            { card: "BT7-069", as: "scatter" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const eyesmonId = s.inst("eyesmon").instanceId;
    expect(s.state.players[0]!.trash).toHaveLength(0);

    await advance(s.engine).verb.trash([eyesmonId, s.inst("scatter").instanceId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === eyesmonId));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT7-069"]);

    const control = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-072", as: "eyesmon" },
            { card: "BT7-069", as: "scatter" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await control.ready();
    await advance(control.engine).verb.trash([control.inst("eyesmon").instanceId]);
    await drainMicrotasks();
    expect(control.state.pendingDecision).toBeUndefined();
    expect(control.state.players[0]!.battleArea).toHaveLength(0);
    expect(control.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT7-072"]);
  });
});
