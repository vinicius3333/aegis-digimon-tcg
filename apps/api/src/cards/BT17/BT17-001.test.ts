import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-001.js";

describe("BT17-001", () => {
  it("as inherited, pays 1 memory to delete an opposing Digimon at 3000 DP or less", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "Delete", cost: { kind: "payMemory", memory: 1 }, target: { filter: { dp: { op: "lte", value: 3000 } } } }] });
  });
});
