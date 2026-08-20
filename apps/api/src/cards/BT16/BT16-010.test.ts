import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-010.js";

describe("BT16-010", () => {
  it("has Retaliation and deletes the lowest-DP opposing Digimon by deleting itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Retaliation" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "EndOfOpponentsTurn", actions: [{ kind: "Delete", cost: { kind: "deleteOwn" }, optional: false }] });
  });
  it("may play a Loogamon or Eiji Nagasumi from trash on deletion", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }] }));
});
