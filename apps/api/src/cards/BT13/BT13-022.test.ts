import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-022.js";

describe("BT13-022 Kamemon", () => {
  it("registers the printed Blocker keyword", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] }));
  });
});
