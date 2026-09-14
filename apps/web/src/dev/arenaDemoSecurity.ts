import { CardInstance, GameState, Permanent, Phase, PlayerState, getCardDefinition, type Seat } from "@aegis/shared";

/** Reproducible visual fixture for the face-up Royal Base security inspection. */
export function createArenaSecurityDemoState(drawCounts: readonly [number, number]): GameState {
  const state = new GameState();
  state.matchId = "arena-security-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 6;
  function card(cardId: string, instanceId: string, seat: Seat, faceUp = true) {
    const result = new CardInstance();
    result.cardId = cardId;
    result.instanceId = instanceId;
    result.ownerSeat = seat;
    result.faceUp = faceUp;
    return result;
  }
  function fighter(cardId: string, id: string, seat: Seat) {
    const result = new Permanent();
    result.permanentId = id;
    result.controllerSeat = seat;
    result.topCard = card(cardId, `${id}-top`, seat);
    result.baseDP = getCardDefinition(cardId)?.dp ?? 0;
    result.currentDP = result.baseDP;
    return result;
  }
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `arena-demo-${seat}`;
    player.displayName = seat === 0 ? "Royal Base" : "Kimeramon";
    player.securityCount = 5;
    player.eggDeckCount = 3;
    player.handCount = (seat === 0 ? 6 : 5) + drawCounts[seat];
    player.deckCount = Math.max(0, 38 - drawCounts[seat]);
    if (seat === 0) {
      // The first two positions are hidden even from the owner.
      player.security.push(
        ...["", "", "BT19-045", "BT18-044", "P-181"].map((id, index) =>
          card(id, `security-${index}`, seat, index >= 2),
        ),
      );
      const partner = fighter("BT18-044", "you-funbeemon", seat);
      partner.stack.push(card("BT18-004", "you-puroromon", seat));
      // Fabricated server projection: two standing +1000 DP security effects.
      partner.currentDP = partner.baseDP + 2000;
      player.battleArea.push(partner);
      player.hand.push(
        ...["BT18-052", "BT18-044", "BT19-048", "BT19-096", "P-230", "BT19-053"].map((id, index) =>
          card(id, `hand-${index}`, seat),
        ),
      );
      for (let index = 0; index < Math.min(drawCounts[seat], 38); index++) {
        player.hand.push(card("BT19-048", `draw-${seat}-${index}`, seat));
      }
    } else {
      player.battleArea.push(fighter("BT19-070", "opponent-kimeramon", seat));
      player.breeding = fighter("BT15-070", "opponent-breeding", seat);
      player.breeding.stack.push(card("BT18-001", "opponent-egg", seat));
      player.breeding.inBreeding = true;
    }
    state.players.push(player);
  }
  return state;
}
