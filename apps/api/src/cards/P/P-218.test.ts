import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./P-218.js";

describe("P-218 Torajiro Asuka", () => {
  it("exposes On Play and Security effects", () => {
    const source = { isOnBattleArea: () => true } as any;
    expect(getEffectModule("P-218")!.effectsForTiming(EffectTiming.OnPlay, source)[0]!.effectKey).toBe("P-218/on-play");
    expect(getEffectModule("P-218")!.effectsForTiming(EffectTiming.SecuritySkill, source)[0]!.effectKey).toBe(
      "P-218/security",
    );
  });

  it("matches only Entertainment, Tool, or Navi cards linked by the current event", async () => {
    const source = {
      permanent: () => ({ permanentId: "tamer" }),
      definition: { effectText: "" },
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as any;
    let subscription: any;
    const effect = getEffectModule("P-218")!.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve({
      source,
      game: { player: () => ({ battleArea: [] }) } as any,
      fx: { subscribeSubTrigger: (entry: any) => (subscription = entry) },
    } as any);
    const linked = { instanceId: "linked", cardId: "ENTERTAINMENT" };
    const host = { controllerSeat: 0, topCard: { instanceId: "top", cardId: "HOST" }, linked: [linked] };
    const game = {
      opponentOf: (seat: number) => (seat === 0 ? 1 : 0),
      player: (seat: number) => ({ battleArea: seat === 0 ? [host] : [] }),
      permanentById: () => host,
      definitionOf: (card: { cardId: string }) => ({
        kinds: card.cardId === "HOST" ? ["Digimon"] : [],
        types: card.cardId === "ENTERTAINMENT" ? ["Entertainment"] : ["Other"],
      }),
    } as any;
    const base = { source, game, trigger: { subjectPermanentId: "host", linkedCardInstanceIds: ["linked"] } } as any;
    expect(subscription.matches(base)).toBe(true);
    expect(
      subscription.matches({ ...base, trigger: { subjectPermanentId: "host", linkedCardInstanceIds: ["other"] } }),
    ).toBe(false);
  });
});
