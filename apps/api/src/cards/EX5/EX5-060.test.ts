import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-060.js";

describe("EX5-060 Dragomon", () => {
  it("plays a suspended opposing level 4 or lower Digimon from trash without its On Play effects", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      controller: "opponent",
      suspend: true,
      ignoreOnPlay: true,
      target: { filter: { location: "trash", controller: "opponent", level: { max: 4 } } },
    });
  });
  it("revives one of your purple Digimon from trash when an opponent plays a Digimon and inherits Piercing", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"], byEffect: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
              optional: true,
              target: {
                count: 1,
                filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levelLteTriggerSource: true },
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Piercing");
  });
});
