import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-012.js";

describe("EX6-012 Biyomon", () => {
  it("has Blocker and inherits Jamming", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Blocker");
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
  });

  it("exposes Blocker while top card and inherited Jamming when stacked", async () => {
    const top = setupEngine({ 0: { battleArea: [{ card: "EX6-012", as: "top" }] } });
    await top.ready();
    expect(observe(top.engine).hasKeyword(top.perm("top"), "Blocker")).toBe(true);
    expect(observe(top.engine).hasKeyword(top.perm("top"), "Jamming")).toBe(false);

    const stacked = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX6-012"] }] } });
    await stacked.ready();
    expect(observe(stacked.engine).hasKeyword(stacked.perm("host"), "Blocker")).toBe(false);
    expect(observe(stacked.engine).hasKeyword(stacked.perm("host"), "Jamming")).toBe(true);
  });
});
