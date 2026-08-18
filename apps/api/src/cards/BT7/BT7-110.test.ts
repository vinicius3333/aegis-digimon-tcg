import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-110.js";

describe("BT7-110 Evolution Ancient", () => {
  it("digivolves a level 4 Hybrid into a same-color Ten Warriors card while ignoring level", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-021", as: "kumamon" }],
        hand: [
          { card: "BT7-110", as: "option" },
          { card: "BT7-030", as: "ancient" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("kumamon").topCard.instanceId === s.inst("ancient").instanceId);

    expect(s.perm("kumamon").topCard.instanceId).toBe(s.inst("ancient").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("does not offer an off-color Ten Warriors card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-021", as: "kumamon" }],
        hand: [
          { card: "BT7-110", as: "option" },
          { card: "BT7-042", as: "offColorAncient" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.perm("kumamon").topCard.cardId).toBe("BT7-021");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("offColorAncient").instanceId)).toBe(true);
  });
});
