import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
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

  it("naturally carries its inherited bonus through a legal Leomon evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-048", as: "base" }],
          hand: [
            { card: "BT14-052", as: "panjyamon" },
            { card: "BT4-061", as: "banchoLeomon" },
          ],
        },
        1: { battleArea: [{ card: "BT14-042", as: "target", suspended: false }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("panjyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("base").topCard?.cardId).toBe("BT14-052");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("banchoLeomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-061");
    expect(s.perm("base").currentDP).toBe(13000);
  });
});
