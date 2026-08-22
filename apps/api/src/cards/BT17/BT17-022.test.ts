import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-022.js";

describe("BT17-022", () => {
  it("can digivolve onto a yellow Tamer as level 3", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "Digivolve", asLevel: 3, onto: { filter: { kind: ["Tamer"], colors: ["Yellow"] } } }] });
  });

  it("digivolves into AncientGarurumon for 3 and deletes itself if successful", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], costOverride: 3, ignoreRequirements: true, optional: true, condition: { kind: "anyOf" } });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({ kind: "DelayedDelete", condition: { kind: "ifThisEffectDigivolved" } });
  });

  it("draws while attacking with 7 or fewer cards in hand as inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", value: 7 } }] });
  });
});
