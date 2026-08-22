import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX11-006.js";
import "../index.js";

describe("EX11-006 Flickmon", () => {
  it("uses a linked Maquinamon to evolve the host into a Maquinamon-text Digimon", async () => {
    const effect = getEffectModule("EX11-006")!.effectsForTiming(EffectTiming.OnUseAttack, {
      cardId: "EX11-006", ownerSeat: 0, definition: {}, permanent: () => undefined,
      isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true,
    } as never)[0]!;
    expect(effect.isInherited).toBe(true);
    expect(effect.effectKey).toContain("EX11-006");
  });
});
