import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-105.js";

describe("BT13-105 Full Moon Meteor Impact", () => {
  it("returns one opposing Digimon, then gains one memory per four cards in the opponent's hand", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Return", to: "hand", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
    expect(actions[1]).toMatchObject({ kind: "GainMemory", amount: 1, scaling: { per: 4, unit: "cards", filter: { zone: "hand", controller: "opponent" } } });
  });

  it("returns one opposing Digimon from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({ kind: "Return", to: "hand", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
  });
});
