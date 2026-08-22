import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-081.js";

describe("BT17-081 Tai Kamiya & Matt Ishida", () => {
  it("triggers on both a Digimon being played and a Digimon digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Digimon"] } },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", sourceFilter: { controller: "mine", kind: ["Digimon"] } },
      ],
    });
  });

  it("suspends this Tamer and independently gains memory for Greymon and Garurumon", () => {
    for (const action of compiled.effects?.[0]?.actions ?? []) {
      expect(action).toMatchObject({ cost: { kind: "suspend", target: { isSelf: true } }, actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "youHave" } }, { kind: "GainMemory", amount: 1, condition: { kind: "youHave" } }] });
    }
  });

  it("once per turn attacks the player with an unsuspended Omnimon-named Digimon", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "EndOfYourTurn", frequency: "OncePerTurn", actions: [{ kind: "Attack", attackPlayer: true, optional: true, target: { filter: { nameOrTrait: [{ tokens: ["Omnimon"], match: "name" }], suspended: false } } }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }] });
  });
});
