import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-096.js";

describe("BT13-096 Homer Yushima", () => {
  it("may play a blue level 3 Digimon from a digivolution card on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
          target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"], levels: [3] }, count: 1 },
        },
      ],
    });
  });

  it("places a blue level 4 or lower Digimon from hand under the played Digimon", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0] as {
      actions?: unknown[];
    };
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Blue"] },
    });
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "PlaceUnder",
      from: ["hand"],
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          isTriggerSource: true,
          colors: ["Blue"],
          levelComparison: { op: "lte", value: 4 },
        },
        count: 1,
      },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
      optional: true,
      abortOnDecline: true,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });
});
