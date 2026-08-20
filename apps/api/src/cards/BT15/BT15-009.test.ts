import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-009.js";

describe("BT15-009", () => {
  it("once per turn pays 2 memory to delete an opposing Digimon at or below this source's DP", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", frequency: "OncePerTurn" });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", relativeToSource: true } } }, cost: { kind: "payMemory", memory: 2 } });
  });
});
