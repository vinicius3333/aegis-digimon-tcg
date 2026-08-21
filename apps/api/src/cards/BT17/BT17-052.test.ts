import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-052.js";

describe("BT17-052 Agumon", () => {
  it("once per turn gains memory and draws when your Kosuke Kisakata is played", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ event: "whenPlayed", sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Kosuke Kisakata"], match: "name" }] }, actions: [{ kind: "GainMemory", amount: 1 }, { kind: "Draw", controller: "mine", amount: 1 }] }],
    });
  });

  it("has Reboot as its inherited keyword", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([{ keyword: "Reboot", raw: "＜Reboot＞" }]);
  });
});
