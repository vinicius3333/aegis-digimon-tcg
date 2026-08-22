import { describe, expect, it } from "vitest";
import { compiled } from "./ST18-14.js";

describe("ST18-14 Shoto Kazama", () => {
  it("declares memory setting, paid redirect to Digimon/player, and Security play", () => {
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "StartOfYourTurn", actions: [expect.objectContaining({ kind: "SetMemory" })] }),
      expect.objectContaining({ trigger: "YourTurn", actions: [expect.objectContaining({ actions: [expect.objectContaining({ kind: "RedirectAttack", includePlayer: true, cost: { kind: "suspend" } })] })] }),
      expect.objectContaining({ trigger: "Security", isSecurity: true }),
    ]));
  });

  it("sets memory to three only from two or less", () => {
    expect(compiled.effects[0]).toMatchObject({ trigger: "StartOfYourTurn", actions: [{ condition: { value: 2 }, value: 3 }] });
  });

  it("plays itself from Security without paying its cost", () => {
    expect(compiled.effects[2]).toMatchObject({ trigger: "Security", actions: [{ kind: "PlayWithoutCost", payCost: false }] });
  });
});
