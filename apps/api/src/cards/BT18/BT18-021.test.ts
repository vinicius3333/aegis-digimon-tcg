import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-021.js";

describe("BT18-021 Penguinmon", () => {
  it("registers the self/Tamer multicolor digivolution reduction and inherited Jamming", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldDigivolve", sourceFilter: { controller: "mine", or: [{ isSelfRef: true }, { kind: ["Tamer"] }] }, into: { multicolor: true, colors: ["Red", "Blue"] }, actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }] }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", isInherited: true, keywords: [{ keyword: "Jamming" }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-021"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
