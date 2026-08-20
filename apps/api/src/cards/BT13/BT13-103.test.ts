import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-103.js";

describe("BT13-103 Akihiro Kurata", () => {
  it("reduces a Belphemon play by deleting a Gizmon Digimon for its play cost", () => {
    const replacement = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0];
    expect(replacement).toMatchObject({ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { controllerDefault: "mine", nameOrTrait: [{ match: "name", tokens: ["Belphemon"] }] } });
    expect((replacement as { actions?: unknown[] }).actions?.[0]).toMatchObject({ kind: "CostModifier", mode: "reduce", costType: "play", dynamicFrom: "deletedDigimonPlayCost", cost: { kind: "deleteOwn", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Gizmon"] }] }, count: 1 } }, optional: true, abortOnDecline: true });
  });

  it("draws and trashes, then optionally places this Tamer under a Belphemon to delete an opposing level 6", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect?.actions?.slice(0, 2).map((action) => action.kind)).toEqual(["Draw", "Trash"]);
    expect(effect?.actions?.[2]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [6] }, count: 1 }, cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "target", underFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Belphemon"] }] } }, optional: true, abortOnDecline: true });
  });
});
