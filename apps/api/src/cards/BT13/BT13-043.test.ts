import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-043.js";

describe("BT13-043 LoaderLeomon", () => {
  it("registers Barrier both as a printed and inherited keyword", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Barrier" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", isInherited: true, keywords: [expect.objectContaining({ keyword: "Barrier" })] });
  });
});
