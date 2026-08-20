import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-001.js";

describe("BT16-001", () => {
  it("once per turn deletes an opposing Digimon at 2000 DP or less when this has two colors", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 2000 } } }, condition: { kind: "selfColorCount", value: 2 } }] }));
});
