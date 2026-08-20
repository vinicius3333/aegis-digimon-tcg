import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-044.js";

describe("EX7-044", () => {
  it("reveals 4, places a Three Musketeers Option under itself, and then may delete a low-cost opposing Digimon or Tamer", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "RevealAdd", revealCount: 4, add: [{ count: 1, to: "placeUnder" }] }, { kind: "Delete", target: { count: 1, filter: { playCostLte: 3 } }, condition: { kind: "ifThisEffectActed" } }]));
  it("inherits Collision", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Collision", raw: "＜Collision＞" }));
});
