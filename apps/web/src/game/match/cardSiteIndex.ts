import type { GameState, Seat } from "@aegis/shared";
import type { EffectSourceLookup, EffectSourceSite } from "../effectSource";

/**
 * Where every card the viewer can see currently sits: which permanent, trash or
 * hand holds it, and which seat owns each visible instance. A pure read of the
 * synchronized state — the client learns nothing here it was not already sent.
 */
export function buildCardSiteIndex(state: GameState): {
  locate: EffectSourceLookup;
  seatOf: (instanceId: string) => Seat | undefined;
  topInstanceOf: (permanentId: string) => string | undefined;
} {
  const sites = new Map<string, ReturnType<EffectSourceLookup>>();
  const instances = new Map<string, EffectSourceSite>();
  const hosts = new Map<string, EffectSourceSite>();
  const seats = new Map<string, Seat>();
  const tops = new Map<string, string>();
  state.players.forEach((player, playerSeat) => {
    const seat = playerSeat as Seat;
    const key = (cardId: string) => `${seat}:${cardId}`;
    const permanents = [...player.battleArea, ...(player.breeding ? [player.breeding] : [])];
    for (const permanent of permanents) {
      const site: EffectSourceSite = { zone: "field", permanentId: permanent.permanentId };
      hosts.set(key(permanent.permanentId), site);
      for (const card of [permanent.topCard, ...(permanent.stack ?? []), ...(permanent.linked ?? [])]) {
        if (card?.instanceId) instances.set(key(card.instanceId), site);
      }
      const cardId = permanent.topCard?.cardId;
      if (cardId && !sites.has(key(cardId)))
        sites.set(key(cardId), { zone: "field", permanentId: permanent.permanentId });
      if (permanent.topCard?.instanceId) tops.set(permanent.permanentId, permanent.topCard.instanceId);
    }
    // Inherited and copied effects (Succession) keep naming their source card
    // after it moves under the current top. Its host owns the field highlight.
    // Check all tops first, then sources, before looking for loose copies.
    for (const permanent of permanents) {
      for (const card of [...(permanent.stack ?? []), ...(permanent.linked ?? [])]) {
        if (card?.cardId && !sites.has(key(card.cardId)))
          sites.set(key(card.cardId), { zone: "field", permanentId: permanent.permanentId });
      }
    }
    for (const card of player.trash) {
      if (card?.instanceId) instances.set(key(card.instanceId), { zone: "trash", instanceId: card.instanceId });
      if (card?.cardId && !sites.has(key(card.cardId)))
        sites.set(key(card.cardId), { zone: "trash", instanceId: card.instanceId });
    }
    for (const card of player.hand ?? []) {
      if (card?.instanceId) instances.set(key(card.instanceId), { zone: "hand", instanceId: card.instanceId });
      if (card?.cardId && !sites.has(key(card.cardId)))
        sites.set(key(card.cardId), { zone: "hand", instanceId: card.instanceId });
      if (card?.instanceId) seats.set(card.instanceId, seat);
    }
    // No deck/eggDeck entries: those zones are never sent to any client (HIDDEN_ZONE_VIEW_TAG),
    // so a card only becomes locatable once it reaches a zone the viewer can see.
  });
  return {
    locate: (cardId, seat, source) => {
      if (source?.sourcePermanentId) {
        const host = hosts.get(`${seat}:${source.sourcePermanentId}`);
        if (host) return host;
      }
      if (source?.sourceInstanceId) return instances.get(`${seat}:${source.sourceInstanceId}`);
      if (source?.sourcePermanentId) return undefined;
      return sites.get(`${seat}:${cardId}`);
    },
    seatOf: (instanceId) => seats.get(instanceId),
    topInstanceOf: (permanentId) => tops.get(permanentId),
  };
}
