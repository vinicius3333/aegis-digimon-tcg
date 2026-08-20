import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-021.js";

describe("EX8-021", () => {
  it("gains 1 memory once per turn when attacking and inherits Jamming", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "GainMemory", amount: 1 }] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Jamming", raw: "＜Jamming＞" });
  });
  it("exposes inherited Jamming on a live host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-021", as: "seadramon" }] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
