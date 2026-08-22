import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-040.js";

describe("BT17-040 Kazuchimon", () => {
  it("suspends an opponent and conditionally grants Security Attack -1", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
    expect(effect?.actions[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" }, condition: { kind: "selfDigivolutionStackHasTrait" } });
  });

  it("reduces security or recovers, then may attack an opponent's Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn", actions: [{ condition: { kind: "securityAtLeast", value: 3 } }, { kind: "SecurityManipulation", op: "addTop", amount: 1 }, { kind: "Attack", optional: true, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }] });
  });
});
