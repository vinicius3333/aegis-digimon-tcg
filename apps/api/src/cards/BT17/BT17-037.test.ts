import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-037.js";

describe("BT17-037 RizeGreymon", () => {
  it("gains DP and Piercing with a suspended Tamer", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.actions[0]).toMatchObject({ kind: "Aura", effect: { kind: "modifyDP", amount: 3000 }, while: { kind: "youHave", filter: { controllerDefault: "mine", suspended: true, kind: ["Tamer"] } } });
    expect(effect?.actions[1]).toMatchObject({ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } }, while: { kind: "youHave", filter: { controllerDefault: "mine", suspended: true, kind: ["Tamer"] } } });
  });

  it("suspends a yellow Tamer to reduce one opposing Digimon by 3000 when digivolving or attacking", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, cost: { kind: "suspend", target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 1 } }, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
  });

  it("once per turn places Marcus Damon from trash on top of security after a red or yellow Tamer is deleted", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ event: "onDeletionOf", sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] }, actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["trash"], toTop: true }] }] });
  });
});
