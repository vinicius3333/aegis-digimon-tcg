import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-052.js";

describe("EX6-052 Bastemon", () => {
  it("has Scapegoat and plays a purple level 3 Digimon from trash on digivolving", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Scapegoat");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { filter: { colors: ["Purple"], levels: [3] } },
    });
  });
  it("inherits once-per-turn purple level 4 or lower revival when an opponent Digimon is deleted", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
              optional: true,
              target: { filter: { colors: ["Purple"], levelComparison: { op: "lte", value: 4 } } },
            },
          ],
        },
      ],
    }));
});
