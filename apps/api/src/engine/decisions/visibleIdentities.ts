import { Zone, type CardInstance, type GameState, type Permanent, type PlayerState, type Seat } from "@aegis/shared";

/**
 * Which cards a decision has to name for itself, so the client can draw them.
 *
 * The synchronized state is redacted per seat (`engine/state/visibility.ts`): a deck is
 * encoded for nobody, a hand only for its owner, and a security card's identity is withheld
 * from BOTH players until it is turned face up (Comprehensive Rules §3-4-3). A decision that
 * offers a card the deciding seat's view does not carry therefore has to publish the identity
 * in `DecisionRequest.options.visibleCards` — otherwise the client resolves nothing for it and
 * draws a card back where a card should be, which is what a reveal-and-choose prompt used to
 * look like for every card it revealed.
 *
 * The rule below is the narrowest one that closes that gap without disclosing anything:
 *
 *   - a card in a seat's OWN deck or egg deck is named to that seat. You cannot choose out of
 *     a pile you may not look at — the game models a blind pick as a POSITION ("the top card",
 *     "1 of your opponent's security cards"), never as a choice between named instances — so a
 *     decision that offers deck cards to their owner is one that has already shown them;
 *   - a FACE-UP card is named to whoever is deciding. `reveal` turns the cards it shows face
 *     up, so every "reveal the top N and choose among them" is covered wherever the reveal
 *     happened;
 *   - a card the deciding seat can already read on the public board — its own or any face-up
 *     card sitting on a permanent (top card, digivolution stack, linked cards), in the trash
 *     or in the Delay zone — is named too. Those zones are public, so the client CAN normally
 *     resolve them out of its own index; naming them anyway means a prompt no longer depends
 *     on the client's copy of a zone being in step with the server's. It discloses nothing
 *     new: this is the same `faceUp || own` test `exposeCardInZone` applies to the board;
 *   - everything else stays unnamed. A face-down security card is the case that matters: the
 *     engine deliberately offers those as real instances for the player to pick blindly among,
 *     and naming them would hand over the whole stack. A face-down digivolution card under an
 *     OPPONENT's Digimon stays unnamed for the same reason.
 *
 * A `visibleCards` entry a card module supplied itself always wins; this only fills gaps.
 */
export function decisionCardIdentities(
  state: GameState,
  seat: Seat,
  instanceIds: readonly string[],
): { instanceId: string; cardId: string }[] {
  const wanted = new Set(instanceIds);
  if (wanted.size === 0) return [];
  const named: { instanceId: string; cardId: string }[] = [];
  const take = (card: CardInstance) => {
    if (!wanted.delete(card.instanceId) || !card.cardId) return;
    named.push({ instanceId: card.instanceId, cardId: card.cardId });
  };
  for (const player of state.players) {
    if (wanted.size === 0) break;
    for (const card of ownLookableZones(player, seat)) take(card);
    for (const card of faceUpCards(player)) take(card);
    for (const card of readableBoardCards(player, seat)) take(card);
  }
  return named;
}

/**
 * The public-board cards `seat` may read: everything in the trash and the Delay zone, and the
 * cards of every permanent (top card, digivolution stack, linked cards) that is either face-up
 * or owned by this seat. Same test as the board's own visibility policy (`exposeCardInZone`),
 * so naming these adds nothing to what the seat already receives.
 */
function readableBoardCards(player: PlayerState, seat: Seat): readonly CardInstance[] {
  const readable: CardInstance[] = [...player.trash, ...player.delayZone];
  const collect = (permanent: Permanent | undefined): void => {
    if (permanent === undefined) return;
    const cards = [
      ...(permanent.topCard === undefined ? [] : [permanent.topCard]),
      ...permanent.stack,
      ...permanent.linked,
    ];
    for (const card of cards) if (card.faceUp || (card.ownerSeat as Seat) === seat) readable.push(card);
  };
  for (const permanent of player.battleArea) collect(permanent);
  collect(player.breeding);
  return readable;
}

/** The piles `seat` may look through when it is the one being asked to choose. */
function ownLookableZones(player: PlayerState, seat: Seat): readonly CardInstance[] {
  if ((player.seat as Seat) !== seat) return [];
  return [...player.deck, ...player.eggDeck];
}

/**
 * Every card of this player currently turned face up in a zone the state redacts. The board,
 * the trash and the Delay zone are public already, so a decision over them needs nothing from
 * here — the client names those out of its own index.
 */
function faceUpCards(player: PlayerState): readonly CardInstance[] {
  const revealed: CardInstance[] = [];
  for (const zone of [player.deck, player.eggDeck, player.hand, player.security]) {
    for (const card of zone) if (card.faceUp) revealed.push(card);
  }
  return revealed;
}

/** The zone an instance sits in, for the guard test's failure message. */
export function zoneOfInstance(state: GameState, instanceId: string): string | undefined {
  for (const player of state.players) {
    const named: [string, readonly CardInstance[]][] = [
      [Zone.Deck, player.deck],
      [Zone.EggDeck, player.eggDeck],
      [Zone.Hand, player.hand],
      [Zone.Security, player.security],
    ];
    for (const [zone, cards] of named) {
      if (cards.some((card) => card.instanceId === instanceId)) return `${zone}:seat${player.seat}`;
    }
  }
  return undefined;
}
