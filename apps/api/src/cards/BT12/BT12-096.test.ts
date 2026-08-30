import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-096.js";

describe("BT12-096 compiled IR module", () => {
  it("registers its printed OnStartTurn effect through the compiled IR record", () => {
    const module = getEffectModule("BT12-096");
    expect(module?.cardId).toBe("BT12-096");
    const source = {
      instanceId: "source-096",
      cardId: "BT12-096",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
  });

  it("sets memory to 3 at the start of your turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-096", as: "tagiru" }] } });
    await s.ready();
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tagiru"));
    expect(s.state.memory).toBe(3);
  });

  it("does not reset memory above 2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-096", as: "tagiru" }] } });
    await s.ready();
    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tagiru"));
    expect(s.state.memory).toBe(3);
  });

  it("plays Tagiru from security without paying its memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT12-096", as: "tagiru", faceUp: true }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tagiru"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-096")).toBe(true);
  });

  it("suspends Tagiru, places an under-Tamer card, and reduces a Save digivolution by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-096", as: "tagiru", under: [{ card: "BT10-075", as: "placedCost" }] },
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
    await settle(() => s.perm("tagiru").isSuspended);

    expect(s.perm("tagiru").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-1);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("placedCost").instanceId)).toBe(true);
  });
});
