import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-014.js";
import "../index.js";

describe("BT16-014", () => {
  it("has Raid and may play God Flame or a Four Great Dragons Option on digivolving or attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Raid" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true }],
    });
  });
  it("grants Goldramon-related effects on all turns", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "GrantStatic", grant: "effects" }],
    }));

  it("uses God Flame from hand without cost when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-014", as: "goldramon" }], hand: [{ card: "EX3-068", as: "godFlame" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("goldramon"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("godFlame").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("godFlame").instanceId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("uses God Flame from hand without cost when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-014", as: "goldramon" }], hand: [{ card: "EX3-068", as: "godFlame" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("goldramon"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("godFlame").instanceId));

    expect(s.perm("target").currentDP).toBe(4000);
  });
});
