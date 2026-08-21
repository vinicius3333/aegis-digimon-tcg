import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-050.js";

describe("BT17-050 Parasitemon", () => {
  it("pays 4 to place itself under a level-5-or-higher Digimon, then suspends and attacks", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect).toMatchObject({ isFromHand: true, actions: [{ kind: "Modal", choose: 1, cost: { kind: "payMemory", memory: 4 } }] });
    const option = effect!.actions[0].options[0];
    expect(option).toHaveLength(3);
    expect(option[0]).toMatchObject({ kind: "PlaceUnder", underFilter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } } });
    expect(option[1]).toMatchObject({ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
    expect(option[2]).toMatchObject({ kind: "Attack", attacker: { filter: { boundRef: "parasitemonHost" } } });
  });

  it("places itself under another Digimon after attacking and carries the inherited deletion/DP effects", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfAttack")?.actions[0]).toMatchObject({ kind: "PlaceUnder", underFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, optional: true });
    expect(compiled.effects.filter((entry) => entry.isInherited).map((entry) => entry.trigger)).toEqual(["AllTurns", "YourTurn"]);
  });
});
