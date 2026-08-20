import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-010.js";

describe("EX9-010", () => {
  it("has Training and once per turn may place a card from hand face-down underneath to delete an opposing Digimon up to 4000 DP when digivolving or attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Delete", optional: true, target: { filter: { dp: { op: "lte", value: 4000 } } }, cost: { kind: "place", destination: "digivolutionStack", faceDown: true } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Delete", optional: true }] });
  });
  it("inherits Raid", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Raid", raw: "＜Raid＞" }));
});
