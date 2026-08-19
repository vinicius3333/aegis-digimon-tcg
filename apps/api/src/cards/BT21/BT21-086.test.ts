import { describe, expect, it } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT21-086.js";

describe("BT21-086 Marcus Damon", () => {
  it("registers the three printed timing windows and a real On Play suspension effect", () => {
    const module = getEffectModule("BT21-086");
    expect(module).toBeDefined();
    const definition: CardDefinition = {
      cardId: "BT21-086",
      set: "BT21",
      nameEn: "Marcus Damon",
      kinds: ["Tamer"] as never,
      colors: ["Yellow", "Red"] as never,
      playCost: 4,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
    };
    const source: CardSource = {
      instanceId: "INST#MARCUS",
      cardId: "BT21-086",
      ownerSeat: 0 as Seat,
      definition,
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    };
    const onPlay = module!.effectsForTiming(EffectTiming.OnPlay, source);
    expect(onPlay).toHaveLength(1);
    expect(onPlay[0]?.effectKey).toBe("BT21-086/on-play");
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnTappedAnyone, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)[0]?.isSecurity).toBe(true);
  });

  it("suspends a Marcus Damon on the field when played", async () => {
    const setup = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-086", as: "newMarcus" }],
          battleArea: [{ card: "BT21-086", as: "existingMarcus" }],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      setup.engine.applyIntent(0, {
        type: "playCard",
        instanceId: setup.inst("newMarcus").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => setup.perm("existingMarcus").isSuspended, 200);

    expect(setup.perm("existingMarcus").isSuspended).toBe(true);
  });
});
