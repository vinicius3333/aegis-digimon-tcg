import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX7-074.js";

describe("EX7-074", () => {
  it("waives its color requirement if you have a LIBERATOR Digimon or Tamer", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      optional: true,
      condition: { kind: "youHave" },
    }));
  it("reveals 3 for a LIBERATOR card and may digivolve from hand with cost reduced by 4", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "RevealAdd", revealCount: 3 },
      { kind: "Digivolve", from: ["hand"], reduceCost: 4, optional: true },
    ]));
  it("plays a low-cost LIBERATOR card from security and adds itself to hand", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([
      { kind: "PlayWithoutCost", payCost: false },
      { kind: "AddToHandSelf" },
    ]));

  it("uses the Option without matching colors when a LIBERATOR Digimon is in the battle area", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX7-074", as: "vortex" }],
        battleArea: [{ card: "BT18-060", as: "liberator" }],
        deck: ["BT1-001", "BT1-001", "BT1-001"],
      },
    });
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vortex").instanceId })).toEqual({
      ok: true,
    });
  });

  it("does not waive colors for a LIBERATOR Digimon in the breeding area (Q3873)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX7-074", as: "vortex" }],
        breeding: { card: "BT18-060", as: "liberator" },
      },
    });
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vortex").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });
});
