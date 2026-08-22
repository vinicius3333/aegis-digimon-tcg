import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { compiled } from "./BT26-045.js";
import "../index.js";

describe("BT26-045 GranKuwagamon", () => {
  it("encodes hand-size reduction, shared free play, and all three Your Turn keywords", () => {
    expect(digivolutionRequirementsFor("BT26-045")).toContainEqual({ level: 5, traits: ["Insectoid", "TS"], cost: 3, isAlternate: true });
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 4 }] });
    expect(compiled.effects?.slice(1, 4)).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "OnPlay", frequency: "OncePerTurn" }),
      expect.objectContaining({ trigger: "WhenDigivolving", sharedUseKey: "bt26-045-free-play" }),
      expect.objectContaining({ trigger: "WhenAttacking", sharedUseKey: "bt26-045-free-play" }),
    ]));
    expect(compiled.effects?.[4]?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Alliance" } }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Piercing" } }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Vortex" } }),
    ]));
  });

  it("publicly grants Alliance, Piercing, and Vortex to an eligible Insectoid", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-045", as: "granKuwagamon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("granKuwagamon"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("granKuwagamon"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("granKuwagamon"), "Vortex")).toBe(true);
  });
});
