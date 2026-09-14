import { CardInstance, Permanent, Zone, getCardDefinition, type GameState, type Seat } from "@aegis/shared";
import {
  extractCardAt,
  insertCard,
  placePermanent,
  pushOnStack,
  setBreeding,
  setTopCard,
  takeBottom,
  takeTop,
} from "./state/access.js";
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
export const DEV_SCENARIO_IDS = ["battle", "arena", "card-bugs"] as const;
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
 * A second permanent for the human only: the Lamiamon line (BT21's Gigimon under BT24's
 * Elizamon, Dimetromon and Lamiamon), so a scene needs a stack with inherited effects and a
 * Lv.5 attacker without playing four turns first. Listed bottom to top; the last card is the
 * one on the field.
 */
const BATTLE_STACK_CARDS: readonly string[] = ["BT21-001", "BT24-008", "BT24-012", "BT24-016"];

/** Extra card in the human's opening hand: the Lv.6 the stack digivolves into (BT24's Medusamon). */
const BATTLE_HAND_CARD = "BT24-017";

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

function faceUpCard(instanceId: string, cardId: string, seat: Seat): CardInstance {
  const card = faceDownCard(instanceId, cardId, seat);
  card.faceUp = true;
  return card;
}

/** A permanent whose top card is the last of `cardIds`, with the rest as its digivolution stack. */
function establishedDigimon(seat: Seat, cardIds: readonly string[], slot = ""): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = `dev-perm-${seat}${slot}`;
  permanent.controllerSeat = seat;
  const topCardId = cardIds[cardIds.length - 1] ?? "";
  setTopCard(permanent, faceUpCard(`dev-field-${seat}${slot}`, topCardId, seat));
  cardIds.slice(0, -1).forEach((cardId, index) => {
    pushOnStack(permanent, faceUpCard(`dev-stack-${seat}${slot}-${index}`, cardId, seat));
  });
  const dp = getCardDefinition(topCardId)?.dp ?? 0;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  permanent.enterFieldTurnCount = ESTABLISHED_TURN;
  return permanent;
}

/**
 * Seat 0 (the human) is the turn player about to take turn 1 with two Digimon ready to attack,
 * one of them a full digivolution stack; seat 1 (the bot) has a Digimon of its own to block or
 * be attacked. Both sides hold an opening hand and a full security stack drawn from their own
 * shuffled decks.
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
    placePermanent(player, establishedDigimon(seat, [BATTLE_FIELD_CARD[seat]]));
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, BATTLE_STACK_CARDS, "-stack"));
    insertCard(human, Zone.Hand, faceDownCard("dev-hand-0", BATTLE_HAND_CARD, 0));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  // Not the rulebook's first turn: the human draws on turn 1 like any later turn.
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/** BT26 demo cards are taken from the staged decks, preserving each physical copy. */
function layArenaScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    function take(cardId: string): CardInstance {
      const zone = getCardDefinition(cardId)?.level === 2 ? Zone.EggDeck : Zone.Deck;
      const cards = zone === Zone.EggDeck ? player!.eggDeck : player!.deck;
      const card = extractCardAt(
        player!,
        zone,
        cards.findIndex((entry) => entry.cardId === cardId),
      );
      if (card === undefined) throw new Error(`Arena deck is missing a copy of ${cardId}`);
      return card;
    }
    function permanent(id: string, cardIds: readonly string[]): Permanent {
      const result = establishedDigimon(seat, cardIds);
      result.permanentId = id;
      result.stack.clear();
      cardIds.slice(0, -1).forEach((cardId) => pushOnStack(result, take(cardId)));
      const top = take(cardIds[cardIds.length - 1]!);
      top.faceUp = true;
      setTopCard(result, top);
      return result;
    }
    const breeding =
      seat === 0
        ? permanent("you-breeding", ["BT26-001", "BT26-009"])
        : permanent("opponent-breeding", ["BT24-007", "BT26-066"]);
    breeding.inBreeding = true;
    setBreeding(player, breeding);
    const field =
      seat === 0
        ? [
            permanent("you-chronomon", ["BT26-001", "BT26-009", "BT26-011", "BT26-015", "BT26-016"]),
            permanent("you-hyokomon", ["BT26-009"]),
            permanent("you-shota", ["BT26-092"]),
          ]
        : [
            permanent("opponent-plutomon", ["BT24-007", "BT26-066", "BT26-069", "BT26-074", "BT26-059"]),
            permanent("opponent-dobermon", ["BT26-069"]),
            permanent("opponent-asuna", ["BT24-088"]),
          ];
    field.forEach((entry) => placePermanent(player, entry));
    if (seat === 1) field[1]!.isSuspended = true;
    const hand =
      seat === 0
        ? ["BT26-009", "BT26-011", "BT26-016", "BT26-087", "BT8-095"]
        : ["BT26-059", "BT26-079", "BT26-074", "BT26-056", "BT26-100"];
    hand.forEach((cardId) => insertCard(player, Zone.Hand, take(cardId)));
    const trash = seat === 0 ? ["BT26-015", "BT8-095"] : ["BT26-074", "BT26-100"];
    trash.forEach((cardId) => insertCard(player, Zone.Trash, take(cardId)));
    // Reserve a real Digimon from Plutomon's deck for the first security battle.
    const securityTop = seat === 1 ? take("BT24-045") : undefined;
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
    if (securityTop !== undefined) {
      const displaced = takeBottom(player, Zone.Security);
      if (displaced !== undefined) insertCard(player, Zone.Deck, displaced);
      insertCard(player, Zone.Security, securityTop, "top");
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/** Reproduces the revealed-card panel and BEATBREAK start-of-main payment. */
function layCardBugsScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  layBattleScenario(state, decks);
  const human = state.players[0]!;
  const tamer = establishedDigimon(0, ["ST23-13"], "-beatbreak");
  pushOnStack(tamer, faceDownCard("dev-old-under", "BT25-046", 0));
  placePermanent(human, tamer);
  const pulse = establishedDigimon(0, ["ST23-15"], "-e-pulse");
  pulse.placedByEffect = true;
  placePermanent(human, pulse);
  placePermanent(human, establishedDigimon(0, ["BT25-090"], "-tomoro"));
  placePermanent(human, establishedDigimon(0, ["BT25-049", "BT25-041"], "-murasame"));
  placePermanent(human, establishedDigimon(0, ["BT25-046", "BT25-049"], "-dual-evolution-target"));
  const second = establishedDigimon(0, ["ST23-14"], "-second-tamer");
  ["BT25-043", "ST23-11"].forEach((id, index) => pushOnStack(second, faceDownCard(`dev-second-under-${index}`, id, 0)));
  placePermanent(human, second);
  placePermanent(human, establishedDigimon(0, ["BT25-046", "BT25-049", "BT25-057"], "-monarch"));
  ["ST23-15", "ST23-08", "BT25-049", "BT25-035", "BT25-057", "ST23-03", "ST23-09"].forEach((id, index) =>
    insertCard(human, Zone.Hand, faceDownCard(`dev-bug-hand-${index}`, id, 0)),
  );
  const opponent = state.players[1]!;
  ["BT19-051", "AD1-006", "BT8-095", "BT19-014"].forEach((id, index) =>
    insertCard(opponent, Zone.Deck, faceDownCard(`dev-reveal-${index}`, id, 1), "top"),
  );
  state.memory = 5;
}

const LAYOUTS: Record<DevScenarioId, typeof layBattleScenario> = {
  battle: layBattleScenario,
  arena: layArenaScenario,
  "card-bugs": layCardBugsScenario,
};

export function layDevScenario(scenario: DevScenarioId, state: GameState, decks: readonly [Decklist, Decklist]): void {
  LAYOUTS[scenario](state, decks);
}
