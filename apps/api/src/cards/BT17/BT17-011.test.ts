import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-011.js";

describe("BT17-011", () => {
  it("can digivolve onto a red Tamer as level 3", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "Digivolve", asLevel: 3, from: "hand", onto: { filter: { kind: ["Tamer"], colors: ["Red"] } } }] });
  });

  it("digivolves into AncientGreymon for 3 and deletes itself if successful", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], costOverride: 3, ignoreRequirements: true, optional: true, condition: { kind: "anyOf" } });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({ kind: "DelayedDelete", condition: { kind: "ifThisEffectDigivolved" } });
  });

  it("has inherited permanent DP", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }] });
  });
});
