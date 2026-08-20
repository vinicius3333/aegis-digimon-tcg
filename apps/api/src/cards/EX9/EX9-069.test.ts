import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX9-069.js";

describe("EX9-069", () => {
  const source = { instanceId: "source", cardId: "EX9-069", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers start-main placement and security play", () => {
    expect(getEffectModule("EX9-069")!.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(1);
    expect(getEffectModule("EX9-069")!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
  it("registers memory/draw on adding digivolution cards and opponent-turn Reboot", () => expect(getEffectModule("EX9-069")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(2));
});
