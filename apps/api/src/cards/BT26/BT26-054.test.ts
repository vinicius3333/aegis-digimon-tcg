import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { compiled } from "./BT26-054.js";

describe("BT26-054 Andromon", () => {
  it("encodes CS Tamer play exclusion, CS stack-add digivolution, and inherited attack redirect", () => {
    expect(digivolutionRequirementsFor("BT26-054")).toContainEqual({ level: 4, traits: ["CS"], cost: 3, isAlternate: true });
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", addedDigivolutionCardFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] }, actions: [{ kind: "Digivolve", from: ["hand"], payCost: false }] }] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "OpponentsTurn", isInherited: true, actions: [{ kind: "RedirectAttack", optional: true }] });
  });
});
