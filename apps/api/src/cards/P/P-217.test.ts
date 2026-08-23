import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./P-217.js";

describe("P-217 Haru Shinkai", () => {
  it("exposes On Play and Security effects", () => {
    const source = { isOnBattleArea: () => true } as any;
    expect(getEffectModule("P-217")!.effectsForTiming(EffectTiming.OnPlay, source)[0]!.effectKey).toBe("P-217/on-play");
    expect(getEffectModule("P-217")!.effectsForTiming(EffectTiming.SecuritySkill, source)[0]!.effectKey).toBe(
      "P-217/security",
    );
  });

  it("matches only traited cards linked by the current event", async () => {
    const source = {
      permanent: () => ({ permanentId: "tamer" }),
      definition: { effectText: "" },
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as any;
    let subscription: any;
    const effect = getEffectModule("P-217")!.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve({
      source,
      game: { player: () => ({ battleArea: [] }) } as any,
      fx: { subscribeSubTrigger: (entry: any) => (subscription = entry) },
    } as any);
    const linked = { instanceId: "linked", cardId: "SOCIAL" };
    const host = { controllerSeat: 0, topCard: { instanceId: "top", cardId: "HOST" }, linked: [linked] };
    const game = {
      opponentOf: (seat: number) => (seat === 0 ? 1 : 0),
      player: (seat: number) => ({ battleArea: seat === 0 ? [host] : [] }),
      permanentById: () => host,
      definitionOf: (card: { cardId: string }) => ({
        kinds: card.cardId === "HOST" ? ["Digimon"] : [],
        types: card.cardId === "SOCIAL" ? ["Social"] : ["Other"],
      }),
    } as any;
    const base = {
      source,
      game,
      trigger: { subjectPermanentId: "host", linkedCardInstanceIds: ["linked"] },
    } as any;
    expect(subscription.matches(base)).toBe(true);
    expect(
      subscription.matches({ ...base, trigger: { subjectPermanentId: "host", linkedCardInstanceIds: ["other"] } }),
    ).toBe(false);
  });
});
