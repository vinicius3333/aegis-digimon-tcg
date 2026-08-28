import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-094.js";

describe("BT12-094 compiled IR module", () => {
  it("registers its printed OnStartMainPhase effect through the compiled IR record", () => {
    const module = getEffectModule("BT12-094");
    expect(module?.cardId).toBe("BT12-094");
    const source = {
      instanceId: "source-094",
      cardId: "BT12-094",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
  });

  it("places a Save Digimon under Yuu and gains 1 memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-094", as: "yuu" }], hand: [{ card: "BT12-008", as: "save" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yuu"));
    await settle(() => s.perm("yuu").stack.some(({ cardId }) => cardId === "BT12-008"));
    expect(s.perm("yuu").stack.map(({ cardId }) => cardId)).toContain("BT12-008");
    expect(s.state.memory).toBe(1);
  });

  it("plays Yuu from security without paying its memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT12-094", as: "yuu", faceUp: true }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("yuu"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-094")).toBe(true);
  });

  it("suspends Yuu, places an under-Tamer card, and reduces a Save digivolution by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-094", as: "yuu", under: [{ card: "BT10-075", as: "placedCost" }] },
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
    await settle(() => s.perm("yuu").isSuspended);

    expect(s.perm("yuu").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-1);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("placedCost").instanceId)).toBe(true);
  });
});
