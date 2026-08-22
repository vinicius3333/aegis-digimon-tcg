import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-069.js";

describe("BT17-069 Fenriloogamon", () => {
  it("binds the trash-played Fenriloogamon or Kazuchimon for the delayed return", () => {
    const digivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(digivolving?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      bindResultAs: "playedFenriloogamon",
      target: { filter: { nameOrTrait: [{ tokens: ["Fenriloogamon", "Kazuchimon"], match: "name" }] } },
    });
    expect(digivolving?.actions[1]).toMatchObject({
      kind: "DelayedEffect",
      trigger: "nextEndOfOpponentTurn",
      effect: { kind: "Return", target: { filter: { boundRef: "playedFenriloogamon" } }, to: "hand" },
    });
  });

  it("keeps the Once Per Turn deletion trigger scoped to SoC or Pulsemon text", () => {
    const effect = compiled.effects.find((entry) => entry.frequency === "OncePerTurn");
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["SoC"], match: "trait" }, { tokens: ["Pulsemon"], match: "text" }] },
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", dp: { op: "lte", value: 10000 } }, count: 1 } }],
    });
  });
});
