import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-042.js";

describe("EX9-042", () => {
  it("suspends and restricts an opposing Digimon on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }] });
  });
  it("once per turn may digivolve after an effect suspends an own WG Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectSuspends", triggerFilter: { nameOrTrait: [{ tokens: ["WG"], match: "trait" }] }, actions: [{ kind: "Digivolve", payCost: false, from: ["hand"] }] }] }));
  it("inherits once-per-turn unsuspend at end of your turn", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "EndOfYourTurn", frequency: "OncePerTurn", actions: [{ kind: "Unsuspend" }] }));
});
