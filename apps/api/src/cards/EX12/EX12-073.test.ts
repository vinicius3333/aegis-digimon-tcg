import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX12-073 Giant Meat", () => {
  it("can be played when an [ME] trait Digimon is in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX12-008", as: "meInBreeding" },
          hand: [{ card: "EX12-073", as: "giantMeat" }],
          deck: ["EX12-008", "EX12-008", "EX12-008"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giantMeat").instanceId });

    expect(result).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("giantMeat").instanceId));
  });

  it("still requires a matching trait when the breeding area is empty", () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX12-073", as: "giantMeat" }] } });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giantMeat").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });
});
