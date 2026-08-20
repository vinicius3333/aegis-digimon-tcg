import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-020.js";

describe("BT14-020", () => {
  it("trashes one opposing source and prevents this Digimon from being blocked at the start of your main phase", () => expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({ actions: [{ kind: "TrashDigivolution", amount: 1 }, { kind: "Restrict", restriction: "beBlocked", duration: "forTheTurn" }] }));
  it("inherits replacement play of Gomamon from its digivolution cards when deleted", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OpponentsTurn", actions: [{ kind: "Replacement", event: "wouldBeDeleted", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false }] }] }));
});
