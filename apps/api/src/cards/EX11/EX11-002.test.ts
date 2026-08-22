import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX11-002.js";
import "../index.js";

describe("EX11-002 inherited unsuspended-attack permission", () => {
  it("allows the host Digimon to attack an unsuspended opponent Digimon", async () => {
    const effect = getEffectModule("EX11-002")!.effectsForTiming(EffectTiming.None, {
      cardId: "EX11-002", ownerSeat: 0, definition: {}, permanent: () => undefined,
      isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true,
    } as never)[0]!;
    expect(effect.isInherited).toBe(true);
    expect(effect.effectKey).toContain("EX11-002");
  });
});
