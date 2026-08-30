import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-093.js";

describe("BT12-093 compiled IR module", () => {
  it("registers its printed OnStartMainPhase effect through the compiled IR record", () => {
    const module = getEffectModule("BT12-093");
    expect(module?.cardId).toBe("BT12-093");
    const source = {
      instanceId: "source-093",
      cardId: "BT12-093",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
  });

  it("places a Save Digimon under Ren and gives one of your Digimon +2000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-093", as: "ren" },
            { card: "BT12-034", as: "target", dp: 5000 },
          ],
          hand: [{ card: "BT12-008", as: "save" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ren"));
    await settle(() => s.perm("ren").stack.some(({ cardId }) => cardId === "BT12-008"));
    expect(s.perm("ren").stack.map(({ cardId }) => cardId)).toContain("BT12-008");
    expect(s.perm("target").currentDP).toBe(7000);
  });

  it("plays Ren from security without paying its memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT12-093", as: "ren", faceUp: true }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("ren"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-093")).toBe(true);
  });

  it("suspends Ren, places an under-Tamer card, and reduces a Save digivolution by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-093", as: "ren", under: [{ card: "BT10-075", as: "placedCost" }] },
            { card: "BT10-071", as: "host" },
          ],
          hand: [{ card: "BT10-075", as: "evolver" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ren").isSuspended);

    expect(s.perm("ren").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-1);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("placedCost").instanceId)).toBe(true);
  });
});
