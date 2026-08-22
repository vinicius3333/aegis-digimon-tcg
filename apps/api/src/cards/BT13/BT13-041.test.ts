import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-041.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-041 Chirinmon", () => {
  it("keeps Barrier and plays inherited Kudamon suspended", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Barrier" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnDeletion", isInherited: true, actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "trash"], suspended: true, optional: true })] });
  });

  it("exposes Barrier on the live Chirinmon permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-041", as: "chirin" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("chirin"), "Barrier")).toBe(true);
  });
});
