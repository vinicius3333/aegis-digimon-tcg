import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-022.js";

describe("BT13-022 Kamemon", () => {
  it("registers the printed Blocker keyword", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] }));
  });

  it("exposes Blocker through the public game observer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-022", as: "kamemon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("kamemon"), "Blocker")).toBe(true);
  });
});
