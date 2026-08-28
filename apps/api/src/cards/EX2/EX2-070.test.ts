import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-070.js";

describe("EX2-070 Digivolution Plug-In S", () => {
  it("draws 1 before its optional free digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-025", "EX2-061"],
          hand: [{ card: "EX2-070", as: "option" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("offers only an applicable printed digivolution cost of 3 or less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-025", as: "terriermon" }],
          hand: [
            { card: "EX2-070", as: "option" },
            { card: "BT18-049", as: "costFour" },
            { card: "BT6-050", as: "costThree" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("terriermon").topCard.instanceId === s.inst("costThree").instanceId);

    expect(s.perm("terriermon").topCard.cardId).toBe("BT6-050");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("costFour").instanceId)).toBe(true);
  });

  it("accepts an applicable special cost of 3 when the ordinary printed cost is 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-025", as: "terriermon" }],
          hand: [
            { card: "EX2-070", as: "option" },
            { card: "BT8-039", as: "specialCostThree" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("terriermon").topCard.instanceId === s.inst("specialCostThree").instanceId);

    expect(s.perm("terriermon").topCard.cardId).toBe("BT8-039");
  });
});
