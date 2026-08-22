import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import "./BT7-029.js";

describe("BT7-029 MagnaGarurumon", () => {
  it("uses the same bounce effect when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-029", under: [{ card: "BT6-049", as: "hybrid-wd" }], as: "magna-wd" }] },
        1: { battleArea: [{ card: "BT6-049", under: ["BT1-010"], as: "target-wd" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetTop = s.perm("target-wd").topCard!.instanceId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("magna-wd"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hybrid-wd").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetTop)).toBe(true);
  });

  it("may unsuspend one of your Digimon when an effect adds a card to your hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-029", suspended: true, as: "magna-ready" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await (s.engine as any).primitives.draw(0, 1);
    await settle(() => !s.perm("magna-ready").isSuspended);

    expect(s.perm("magna-ready").isSuspended).toBe(false);
  });

  it("returns a Hybrid source and an opposing Digimon of the same level when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-029", under: [{ card: "BT6-049", as: "hybrid" }], as: "magna" }] },
      1: { battleArea: [{ card: "BT6-049", under: [{ card: "BT1-010", as: "targetSource" }], as: "target" }], security: ["BT1-101"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const targetId = s.perm("target").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("magna").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId) &&
      s.state.players[1]!.hand.some((card) => card.instanceId === targetId),
    );

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("targetSource").instanceId)).toBe(true);
  });

  it("Q1550 shares once-per-turn use between When Digivolving and When Attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{
            card: "BT7-029",
            under: [{ card: "BT6-049", as: "firstHybrid" }, { card: "BT6-049", as: "secondHybrid" }],
            as: "magna",
          }],
        },
        1: {
          battleArea: [
            { card: "BT6-049", as: "firstTarget" },
            { card: "BT6-049", as: "secondTarget" },
          ],
          security: ["BT1-101"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("magna"));
    expect(s.perm("magna").stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("magna").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await s.ready();

    expect(s.perm("magna").stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
