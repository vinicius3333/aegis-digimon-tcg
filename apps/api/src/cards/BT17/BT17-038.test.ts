import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-038.js";

describe("BT17-038 Sakuyamon", () => {
  it("reduces one opposing Digimon by 6000 and may use a qualifying yellow or Plug-In Option", () => {
    const actions = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -6000, duration: "forTheTurn", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
    expect(actions?.[1]).toMatchObject({ kind: "UseOptionWithoutCost", optional: true, filter: { orFilters: [{ kind: ["Option"], controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] }, { kind: ["Option"], color: "yellow", playCost: { max: 5 }, controller: "mine", zone: "hand" }] } });
  });

  it("once per turn prevents opponent-effect return to hand or deck after a cost-2 Option", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ event: "whenOptionUsed", fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 }, actions: [{ kind: "Restrict", restriction: "beReturned", duration: "untilOpponentTurnEnd", byOpponentEffectsOnly: true }] }] });
  });
});
