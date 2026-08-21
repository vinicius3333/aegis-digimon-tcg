import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-053.js";

describe("BT17-053 Keramon", () => {
  it("evolves into Infermon for free when an opposing level-5-or-higher Digimon is played or evolves", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect?.actions).toHaveLength(2);
    for (const action of effect!.actions) {
      expect(action).toMatchObject({ event: expect.stringMatching(/^when/), sourceFilter: { controller: "opponent", kind: ["Digimon"] }, actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, ignoreRequirements: true, optional: true }] });
      expect(action.actions[0]).toMatchObject({ condition: { kind: "triggerSubjectMatchesFilter", filter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } } } });
    }
  });

  it("may play a Diaboromon Token after deletion when it had Unidentified", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "PlayToken", tokens: ["Diaboromon Token"], count: 1, payCost: false, optional: true, condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Unidentified"], match: "trait" }] } } }] });
  });
});
