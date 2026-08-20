import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT14-030.js";

describe("BT14-030", () => {
  const source = { instanceId: "source", cardId: "BT14-030", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers the return-to-hand effects on play and digivolution", () => {
    expect(getEffectModule("BT14-030")!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(getEffectModule("BT14-030")!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });
  it("records the documented recovery seam as an engine residual", () => expect(getEffectModule("BT14-030")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(0));
});
