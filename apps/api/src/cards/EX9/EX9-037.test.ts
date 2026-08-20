import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-037.js";

describe("EX9-037", () => {
  it("suspends an opposing Digimon and prevents that same target from unsuspending until the opponent's turn end", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Suspend", cost: { kind: "place", target: { filter: { zone: "hand" } } } }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd", target: { sameTarget: true } }] });
  });
  it("inherits once-per-turn suspension when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Suspend", target: { filter: { controller: "opponent" } } }] }));
});
