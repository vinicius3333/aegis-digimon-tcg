import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-106.js";

describe("BT8-106 Senbon Dokkān", () => {
  it("publishes the 15 play-cost budget with the revealed-card decision", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT8-059"],
        hand: [{ card: "BT8-106", as: "option" }],
        deck: [
          { card: "BT8-065", as: "cheap" },
          { card: "BT8-068", as: "expensive" },
          { card: "BT8-001", as: "remainder" },
        ],
      },
    }, { autoOrderTriggers: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));

    const decision = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    expect(decision.options?.maxTotalPlayCost).toBe(15);
    expect(decision.options?.visibleCards).toEqual([
      { instanceId: s.inst("cheap").instanceId, cardId: "BT8-065" },
      { instanceId: s.inst("expensive").instanceId, cardId: "BT8-068" },
      { instanceId: s.inst("remainder").instanceId, cardId: "BT8-001" },
    ]);
  });

  it("plays revealed Mamemon cards within the 15-cost budget and deletes once per card played", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT8-059"],
        hand: [{ card: "BT8-106", as: "option" }],
        deck: [
          { card: "BT8-061", as: "mamemon" },
          { card: "BT8-065", as: "catchMamemon" },
          { card: "BT8-001", as: "remainder" },
        ],
      },
      1: { battleArea: [{ card: "BT8-023", as: "firstTarget" }, { card: "BT8-026", as: "secondTarget" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5_000);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("catchMamemon").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("remainder").instanceId)).toBe(true);
  });
});
