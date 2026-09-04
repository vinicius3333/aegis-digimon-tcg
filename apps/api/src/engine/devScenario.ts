import { CardInstance, Permanent, Zone, getCardDefinition, type GameState, type Seat } from "@aegis/shared";
import { insertCard, placePermanent, setTopCard, takeBottom, takeTop } from "./state/access.js";
import {
  loadDeckInto,
  makeRng,
  OPENING_HAND_SIZE,
  seatSeed,
  setSecurityStack,
  shuffleDecks,
  type Decklist,
} from "./setup.js";

/**
 * Development-only board layouts. A dev scenario replaces the pre-game procedure (shuffle,
 * mulligan, security) with a hand-laid board and then hands control to the real turn loop, so
 * a developer lands mid-match instead of playing the opening turns every time.
 */
export const DEV_SCENARIO_IDS = ["battle"] as const;
export type DevScenarioId = (typeof DEV_SCENARIO_IDS)[number];

export function isDevScenarioId(value: unknown): value is DevScenarioId {
  return typeof value === "string" && (DEV_SCENARIO_IDS as readonly string[]).includes(value);
}

/**
 * Both gates that read a permanent's arrival turn (summoning sickness, ＜Delay＞) compare it for
 * equality with the current turn, so a value the match never reaches reads as "arrived earlier".
 */
const ESTABLISHED_TURN = 4294967295;

/** One fixed shuffle: the same deck lands the same hand and security stack on every reset. */
const DEV_SCENARIO_SEED = 0x5ca1ab1e;

/** Digimon each seat starts with on the battle area: an established Lv.4 that can attack right away. */
const BATTLE_FIELD_CARD: Record<Seat, string> = { 0: "ST1-07", 1: "ST2-06" };

/**
 * Tamer on top of each seat's security stack: Taiki Kudo plays itself from security and then
 * fires its [On Play] reveal, so one check exercises a security play plus an on-play effect.
 */
const BATTLE_SECURITY_TOP_CARD: Record<Seat, string> = { 0: "BT10-087", 1: "BT10-087" };

function faceDownCard(instanceId: string, cardId: string, seat: Seat): CardInstance {
  const card = new CardInstance();
  card.instanceId = instanceId;
  card.cardId = cardId;
  card.ownerSeat = seat;
  card.faceUp = false;
  return card;
}

function establishedDigimon(seat: Seat, cardId: string): Permanent {
  const top = new CardInstance();
  top.instanceId = `dev-field-${seat}`;
  top.cardId = cardId;
  top.ownerSeat = seat;
  top.faceUp = true;
  const permanent = new Permanent();
  permanent.permanentId = `dev-perm-${seat}`;
  permanent.controllerSeat = seat;
  setTopCard(permanent, top);
  const dp = getCardDefinition(cardId)?.dp ?? 0;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  permanent.enterFieldTurnCount = ESTABLISHED_TURN;
  return permanent;
}

/**
 * Seat 0 (the human) is the turn player about to take turn 1 with a Digimon ready to attack; seat
 * 1 (the bot) has a Digimon of its own to block or be attacked. Both sides hold an opening hand and
 * a full security stack drawn from their own shuffled decks.
 */
function layBattleScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    for (let n = 0; n < OPENING_HAND_SIZE; n += 1) {
      const card = takeTop(player, Zone.Deck);
      if (card !== undefined) insertCard(player, Zone.Hand, card);
    }
    setSecurityStack(player);
    // Swap the Tamer in for the bottom card so the stack keeps its rulebook size of 5.
    insertCard(
      player,
      Zone.Security,
      faceDownCard(`dev-security-${seat}`, BATTLE_SECURITY_TOP_CARD[seat], seat),
      "top",
    );
    takeBottom(player, Zone.Security);
    placePermanent(player, establishedDigimon(seat, BATTLE_FIELD_CARD[seat]));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  // Not the rulebook's first turn: the human draws on turn 1 like any later turn.
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

const LAYOUTS: Record<DevScenarioId, typeof layBattleScenario> = {
  battle: layBattleScenario,
};

export function layDevScenario(scenario: DevScenarioId, state: GameState, decks: readonly [Decklist, Decklist]): void {
  LAYOUTS[scenario](state, decks);
}
