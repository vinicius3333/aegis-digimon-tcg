import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-087.js";

describe("BT20-087 Kota Domoto & Yuji Musya", () => {
  it("sets memory to 3 at the start of turn when memory is 2 or less", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn")?.actions[0]).not.toHaveProperty(
      "actions",
    );
  });

  it("only offers the reduced Chronicle digivolution for a field Digimon", () => {
    const watcher = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(watcher).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: { controller: "mine", kind: ["Digimon"] },
                orFilters: [{ controller: "mine", kind: ["Digimon"], zone: "breeding" }],
              },
              into: {
                levelComparison: { op: "lte", value: 6 },
                nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
              },
              reduceCost: 1,
              cost: { kind: "suspend", target: { isSelf: true } },
              abortOnDecline: true,
            },
          ],
        },
      ],
    });
  });

  it("registers exactly one security play effect", () => {
    expect(compiled.effects.filter((entry) => entry.trigger === "Security")).toHaveLength(1);
  });
});
