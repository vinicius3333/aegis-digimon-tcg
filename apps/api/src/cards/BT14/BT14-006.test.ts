import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT14-006.js";

describe("BT14-006", () => {
  const source = { instanceId: "source", cardId: "BT14-006", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers the inherited when-hand-trashed digivolution watcher", () => expect(getEffectModule("BT14-006")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1));
});
