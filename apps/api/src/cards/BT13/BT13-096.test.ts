import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-096.js";

describe("BT13-096 Homer Yushima", () => {
  it("may play a blue level 3 Digimon from a digivolution card on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true, target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"], levels: [3] }, count: 1 } });
  });

  it("places a blue level 4 or lower Digimon from hand under the played Digimon", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0] as { actions?: unknown[] };
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenPlayed" });
    expect(watcher.actions?.[0]).toMatchObject({ kind: "PlaceUnder", from: ["hand"], target: { filter: { controller: "mine", kind: ["Digimon"], isTriggerSource: true, colors: ["Blue"], levelComparison: { op: "lte", value: 4 } }, count: 1 }, cost: { kind: "suspend" }, optional: true, abortOnDecline: true });
  });
});
