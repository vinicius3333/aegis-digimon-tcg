import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-035.js";

describe("BT12-035 Ekakimon", () => {
  it("has the printed zero-cost evolution route from a level-2 Save card", () => {
    expect(digivolutionRequirementsFor("BT12-035")).toContainEqual({
      level: 2,
      texts: ["Save"],
      cost: 0,
      isAlternate: true,
    });
  });

  it("inherited attack effect gives -2000 DP when the host has Save text and resolves once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-008", as: "host", under: ["BT12-035"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);
  });

  it("does not reduce DP when the host lacks Save text", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "host", under: ["BT12-035"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
  });
});
