import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX11-004.js";

describe("EX11-004 Kapurimon", () => {
  it("subscribes to face-up cards added to the opponent's security", async () => {
    const subscriptions: Array<{ matches: (ctx: any) => boolean }> = [];
    const source = {
      cardId: "EX11-004",
      definition: getCardDefinition("EX11-004"),
      ownerSeat: 0,
      permanent: () => ({ permanentId: "host" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as any;
    const effect = getEffectModule("EX11-004")!.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve({
      source,
      fx: { subscribeSubTrigger: (subscription: any) => subscriptions.push(subscription) },
    } as any);

    // The watcher fires for a face-up add to the OPPONENT's security, and only on its own
    // owner's turn — the printed "[Your Turn]" window travels with the installed watcher.
    const addToSecurity = (seat: number, over: Partial<typeof source> = {}) => ({
      source: { ...source, ...over },
      trigger: { addedToSecuritySeat: seat, addedToSecurityInstanceIds: ["card"] },
      game: {
        opponentOf: (own: number) => (own === 0 ? 1 : 0),
        player: () => ({ security: [{ instanceId: "card", faceUp: true }] }),
        definitionOf: () => ({ types: [] }),
      },
    });

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]!.matches(addToSecurity(1))).toBe(true);
    // An add to the controller's OWN security is not the watched event.
    expect(subscriptions[0]!.matches(addToSecurity(0))).toBe(false);
    expect(subscriptions[0]!.matches(addToSecurity(1, { isOwnersTurn: () => false }))).toBe(false);
  });
});
