import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-052.js";

describe("BT14-052", () => {
  it("is treated as having Leomon in its name by rule", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Leomon"] }],
    }));
  it("on digivolution suspends an opponent and treats itself as Leomon, with Piercing", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      keywords: [{ keyword: "Piercing" }],
      actions: [{ kind: "Suspend" }, { kind: "GrantStatic", grant: "name", tokens: ["Leomon"] }],
    }));
  it("inherits +2000 DP for Leomon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "Aura", effect: { amount: 2000 }, while: { kind: "selfHasNameContaining" } }],
    }));
});
