import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-073.js";

describe("EX9-073", () => {
  it("once per turn activates the placed level-five Cyborg or Ver.5 card's On Play effect", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "ActivateMain", effectTrigger: "On Play", cost: { kind: "place", position: "top", target: { count: 1 } } }] });
  });
  it("can prevent itself from leaving by trashing two bottom qualifying digivolution cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ actions: [{ kind: "Replacement", event: "wouldLeavePlay", actions: [{ kind: "Prevent", cost: { kind: "trash", target: { count: 2 } } }] }] }));
});
