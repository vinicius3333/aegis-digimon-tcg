import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-055.js";
import "../index.js";

describe("BT16-055", () => {
  it("protects one of your Digimon from DP reduction and de-digivolution", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "GrantStatic",
        grant: { kind: "Protection", protections: ["dpReduction", "deDigivolve"] },
        duration: "untilOpponentTurnEnd",
        condition: { kind: "securityAtLeast", value: 3 },
      });
    }
  });

  it("grants Blocker and Reboot when security is three or fewer", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        condition: { kind: "securityAtMost", value: 3 },
      });
      expect(effect.actions?.[2]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Reboot" },
        condition: { kind: "securityAtMost", value: 3 },
      });
    }
  });

  it("has inherited Pulsemon conditional DP", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfTopHasText" } }],
    });
  });

  it("grants Blocker and Reboot at exactly three security cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-055", as: "namake" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          battleArea: [{ card: "BT1-009", as: "ally" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("namake").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Reboot"));

    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Reboot")).toBe(true);
  });
});
