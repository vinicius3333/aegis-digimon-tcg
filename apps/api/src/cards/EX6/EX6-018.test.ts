import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-018.js";

describe("EX6-018 Lucemon", () => {
  it("reduces play cost by 5 when you have no level 5 or lower Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 5, condition: { kind: "youHaveNone" } }],
    });
  });
  it("reveals three for Angel-family or Seven Great Demon Lords cards and can evolve into Chaos Mode from trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "trash",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "place", destination: "security", position: "top", targetIsPermanent: true },
      actions: [{ kind: "Digivolve", from: ["trash"], payCost: false, optional: true }],
    });
  });
  it("pays the level-6 security cost before independently offering the optional trash evolution", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0];
    expect(action).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "place", destination: "security", targetIsPermanent: true },
      actions: [{ kind: "Digivolve", optional: true, from: ["trash"] }],
    });
    expect(action).not.toHaveProperty("into");
  });
});
