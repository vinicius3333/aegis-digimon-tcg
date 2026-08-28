import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-035.js";

describe("BT2-035 GeoGreymon", () => {
  it("gives an opposing Digimon -2000 DP when attacking with 3 yellow Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-038", as: "attacker", under: ["BT2-035"] }, "BT1-087", "BT1-087", "BT1-087"],
        },
        1: { battleArea: [{ card: "BT2-043", as: "target", dp: 6000 }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle(() => s.perm("target").currentDP === 4000, 5000);

    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("does not apply the inherited effect with only 2 yellow Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-038", as: "attacker", under: ["BT2-035"] }, "BT1-087", "BT1-087"],
        },
        1: { battleArea: [{ card: "BT2-043", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));

    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("counts only its controller's yellow Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-038", as: "attacker", under: ["BT2-035"] }, "BT1-087", "BT1-087", "BT1-085"],
        },
        1: { battleArea: [{ card: "BT2-043", as: "target", dp: 6000 }, "BT1-087"] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));

    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("deletes a 2000 DP target through the zero-DP rule check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-038", as: "attacker", under: ["BT2-035"] }, "BT1-087", "BT1-087", "BT1-087"],
        },
        1: { battleArea: [{ card: "BT2-034", as: "target", dp: 2000 }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT2-034")).toBe(true);
  });

  it("does not apply the inherited effect while GeoGreymon is the top card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-035", as: "attacker" }, "BT1-087", "BT1-087", "BT1-087"] },
        1: { battleArea: [{ card: "BT2-043", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));

    expect(s.perm("target").currentDP).toBe(6000);
  });
});
