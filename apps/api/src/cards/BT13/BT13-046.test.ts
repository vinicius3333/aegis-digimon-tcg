import { describe, expect, it } from "vitest";
import { CardColor, CardKind, EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT13-046.js";

describe("BT13-046 Kentaurosmon", () => {
  it("reveals a hand card and places a yellow card into security", async () => {
    const yellow = { instanceId: "yellow", cardId: "YELLOW", ownerSeat: 0 };
    const calls: { verb: string; args: unknown[] }[] = [];
    const players = [
      { security: [{ instanceId: "s1" }, { instanceId: "s2" }, { instanceId: "s3" }], hand: [yellow], battleArea: [] },
      { security: [{ instanceId: "s4" }, { instanceId: "s5" }], hand: [], battleArea: [] },
    ];
    const ctx = {
      source: { ownerSeat: 0, cardId: "BT13-046", instanceId: "source", permanent: () => undefined, isOnBattleArea: () => true },
      game: {
        player: (seat: number) => players[seat],
        opponentOf: () => 1,
        definitionOf: (card: { cardId: string }) => card.cardId === "YELLOW"
          ? { cardId: "YELLOW", nameEn: "Yellow", kinds: [CardKind.Digimon], colors: [CardColor.Yellow] }
          : { cardId: card.cardId, nameEn: card.cardId, kinds: [CardKind.Digimon], colors: [] },
      },
      fx: {
        gainMemoryForSeat: (...args: unknown[]) => calls.push({ verb: "gainMemoryForSeat", args }),
        revealCard: (...args: unknown[]) => calls.push({ verb: "revealCard", args }),
        addSecurity: async (...args: unknown[]) => { calls.push({ verb: "addSecurity", args }); },
      },
      ask: { selectCards: async () => ["yellow"] },
    } as any;
    const effect = getEffectModule("BT13-046")!.effectsForTiming(EffectTiming.OnPlay, ctx.source)[0]!;
    await effect.resolve(ctx);
    expect(calls.find((call) => call.verb === "gainMemoryForSeat")?.args).toEqual([0, 3]);
    expect(calls.find((call) => call.verb === "revealCard")?.args).toEqual([0, "YELLOW", "BT13-046"]);
    expect(calls.find((call) => call.verb === "addSecurity")?.args[1]).toEqual(["yellow"]);
  });
});
