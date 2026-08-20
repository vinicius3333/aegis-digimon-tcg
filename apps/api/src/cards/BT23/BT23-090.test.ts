import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-090.js";

describe("BT23-090 Keisuke Amasawa", () => {
  it("gates the End of Your Turn CS Tamer play behind suspend and Hudie return costs", () => {
    const end = compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn") as any;
    expect(end.actions).toHaveLength(1);
    expect(end.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      cost: { kind: "compound", costs: [{ kind: "suspend" }, { kind: "return", to: "hand" }] },
    });
  });

  it("sets memory at turn start and grants all Hudie Digimon +1000 DP", () => {
    const start = compiled.effects.find((effect) => effect.trigger === "StartOfYourTurn") as any;
    expect(start.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });
    const aura = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions?.[0] as any;
    expect(aura).toMatchObject({ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { count: "all" } });
  });
});
