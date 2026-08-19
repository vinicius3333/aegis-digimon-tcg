import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import module from "./BT23-025.js";

describe("BT23-025 MarineAngemon", () => {
  it("returns the lowest-level opposing Digimon on play and when digivolving", () => {
    expect(module.effectsForTiming(EffectTiming.OnPlay, {} as any)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, {} as any)).toHaveLength(1);
  });

  it("defers the Security play until the security battle ends and schedules turn-end deletion", async () => {
    const source = { instanceId: "CARD", ownerSeat: 0 } as any;
    const effect = module.effectsForTiming(EffectTiming.SecuritySkill, source)[0]!;
    const subscriptions: any[] = [];
    await effect.resolve({ fx: { subscribeSubTrigger: (sub: any) => subscriptions.push(sub) } } as any);
    expect(subscriptions[0]).toMatchObject({
      event: "whenSecurityBattleEnded",
      sourceInstanceId: "CARD",
      once: true,
      expiresOnTurnEndOf: 0,
    });
    let deleted: string | undefined;
    await subscriptions[0].run({
      fx: {
        playInstances: async () => [{ permanentId: "PLAYED" }],
        delayedDeletePlayed: (id: string) => {
          deleted = id;
        },
      },
    });
    expect(deleted).toBe("PLAYED");
  });
});
