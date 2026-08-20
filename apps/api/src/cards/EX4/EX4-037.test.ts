import { describe, expect, it } from "vitest";
import { CardColor, CardKind, EffectTiming, type CardDefinition, type CardInstance, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import "./EX4-037.js";

const card = (id: string): CardInstance => ({ cardId: id, instanceId: id, ownerSeat: 0 as Seat, faceUp: true } as unknown as CardInstance);
const definition = (id: string, colors: CardColor[]): CardDefinition => ({ cardId: id, set: "TEST", nameEn: id, kinds: [CardKind.Digimon], colors, playCost: 5, dp: 1000, level: 5, evoCosts: [], maxCountInDeck: 4 });

describe("EX4-037 BlackMegaGargomon", () => {
  it("offers the end-of-turn Blocker/Reboot effect for two green-and-black Digimon", async () => {
    const self = { permanentId: "self", topCard: card("EX4-037"), stack: [], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const first = { permanentId: "first", topCard: card("FIRST"), stack: [], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const second = { permanentId: "second", topCard: card("SECOND"), stack: [], linked: [], isSuspended: false, inBreeding: false } as unknown as Permanent;
    const players = [{ battleArea: [self, first, second], security: [], hand: [], deck: [], trash: [] }, { battleArea: [], security: [], hand: [], deck: [], trash: [] }];
    const defs = new Map([["EX4-037", definition("EX4-037", [CardColor.Green, CardColor.Black])], ["FIRST", definition("FIRST", [CardColor.Green, CardColor.Black])], ["SECOND", definition("SECOND", [CardColor.Green, CardColor.Black])]]);
    const game = { state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState, player: (seat: Seat) => players[seat], definitionOf: (c: CardInstance) => defs.get(c.cardId)! };
    const source: CardSource = { instanceId: "EX4-037", cardId: "EX4-037", ownerSeat: 0 as Seat, definition: defs.get("EX4-037")!, permanent: () => self, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true };
    const effect = getEffectModule("EX4-037")!.effectsForTiming(EffectTiming.OnEndTurn, source)[0]!;
    expect(effect.maxPerTurn).toBe(1);
    expect(await effect.canActivate?.({ source, game } as unknown as EffectContext)).toBe(true);
  });
});
