import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-004.js";

describe("EX8-004", () => {
  it("inherits a once-per-turn optional attack when another NSp Digimon is played", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Attack", optional: true, withoutSuspending: false, condition: { kind: "selfHasTrait" } }] }] }));
  it("requires the played card to be another friendly NSp Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"], nameOrTrait: [{ tokens: ["NSp"], match: "trait" }] } }));
});
