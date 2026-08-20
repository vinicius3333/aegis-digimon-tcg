import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-069.js";

describe("EX5-069 Seventh Penetration", () => {
  it("deletes an opposing level 6 or lower Digimon by trashing a hand card, then plays Leviamon when the trashed card is a Seven Great Demon Lord", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main" && entry.actions?.[0]?.kind === "Delete")?.actions).toMatchObject([{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 6 } } }, cost: { kind: "trash", target: { bindAs: "trashedCard" } } }, { kind: "PlaceInBattleAreaSelf", condition: { kind: "boundCardHasTrait", bindRef: "trashedCard" } }]);
  });
  it("arms Delay when an effect plays an opposing Digimon and activates the security Main effect", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "SubTrigger", sourceFilter: { controller: "opponent", byEffect: true }, actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" } }] });
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]?.kind).toBe("ActivateMain");
  });
});
