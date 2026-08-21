import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX5-043.js";

describe("EX5-043 Leopardmon (X Antibody)", () => {
  it("registers once-per-turn When Digivolving and Main play effects plus the play-triggered bounce effect", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-043",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-043")!;
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]).toMatchObject({
      maxPerTurn: 1,
      optional: true,
      description: expect.stringContaining("reduced by 4"),
    });
    expect(module.effectsForTiming(EffectTiming.OnDeclaration, source)[0]).toMatchObject({
      maxPerTurn: 1,
      optional: true,
      description: expect.stringContaining("reduced by 4"),
    });
    expect(module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)[0]).toMatchObject({
      maxPerTurn: 1,
      optional: true,
      description: expect.stringContaining("5000 DP"),
    });
  });
});
