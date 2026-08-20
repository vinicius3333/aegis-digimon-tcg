import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT16-090.js";

const source = { instanceId: "source", cardId: "BT16-090", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as unknown as CardSource;

describe("BT16-090", () => {
  it("registers start-turn memory, main breeding-area exchange, and security play", () => {
    const module = getEffectModule("BT16-090");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnDeclaration, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("does not expose unrelated timing effects", () => {
    expect(getEffectModule("BT16-090")!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });
});
