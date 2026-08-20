import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-015.js";

describe("BT15-015", () => {
  it("once per turn pays 2 memory for Security Attack +1 and may attack", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", frequency: "OncePerTurn", actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, cost: { kind: "payMemory", memory: 2 } }, { kind: "Attack", optional: true }] });
  });
});
