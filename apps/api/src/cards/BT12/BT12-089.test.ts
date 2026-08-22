import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-089.js";

describe("BT12-089 handwritten module", () => {
  it("registers its printed OnStartTurn effect without declarative effect record", () => {
    const module = getEffectModule("BT12-089");
    expect(module?.cardId).toBe("BT12-089");
    const source = {
      instanceId: "source-089",
      cardId: "BT12-089",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });

  it("sets memory to 3 at the start of your turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-089", as: "takato" }] } });
    await s.ready();
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("takato"));
    expect(s.state.memory).toBe(3);
  });

  it("does not reset memory above 2 and exposes the printed security play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-089", as: "takato" }] } });
    await s.ready();
    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("takato"));
    expect(s.state.memory).toBe(3);

    const module = getEffectModule("BT12-089");
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, s.perm("takato"))).toHaveLength(1);
  });

  it("places the required cards under Guilmon, digivolves to Gallantmon, and grants +2000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-089", as: "takato" },
            { card: "BT12-007", as: "guilmon" },
          ],
          hand: [{ card: "BT12-018", as: "gallantmon" }],
          trash: ["BT12-010", "BT12-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const before = s.perm("guilmon").currentDP;

    await advance(s.engine).fire(EffectTiming.OnUseOption, s.perm("takato"));
    await settle(() => s.perm("guilmon").topCard?.cardId === "BT12-018");

    expect(s.perm("guilmon").topCard?.cardId).toBe("BT12-018");
    expect(s.perm("guilmon").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT12-089", "BT12-010", "BT12-016"]),
    );
    expect(s.perm("guilmon").currentDP).toBe(before + 2000);
  });
});
