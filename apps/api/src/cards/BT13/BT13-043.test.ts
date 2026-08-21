import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-043.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-043 LoaderLeomon", () => {
  it("registers Barrier both as a printed and inherited keyword", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Barrier" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", isInherited: true, keywords: [expect.objectContaining({ keyword: "Barrier" })] });
  });

  it("exposes Barrier on the live LoaderLeomon permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-043", as: "loader" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("loader"), "Barrier")).toBe(true);
  });
});
