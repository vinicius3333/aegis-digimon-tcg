import { CardInstance, Permanent, Zone, getCardDefinition, type GameState, type Seat } from "@aegis/shared";
import {
  extractCardAt,
  insertCard,
  placePermanent,
  pushOnStack,
  replaceStack,
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
export const DEV_SCENARIO_IDS = [
  "battle",
  "arena",
  "arena-aegiochus-dark-assembly",
  "arena-ex13-grademon-immunity",
  "arena-ex13-examon",
  "arena-jupitermon-siren",
  "arena-magnamon-x",
  "arena-vortexdramon",
  "card-bugs",
  "security-battle",
  "security-chain",
] as const;
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
      replaceStack(
        result,
        cardIds.slice(0, -1).map((cardId) => take(cardId)),
      );
      const top = take(cardIds[cardIds.length - 1]!);
      top.faceUp = true;
      setTopCard(result, top);
      return result;
    }
    function catalogPermanent(id: string, cardIds: readonly string[]): Permanent {
      const result = establishedDigimon(seat, cardIds, `-${id}`);
      result.permanentId = id;
      return result;
    }
    function catalogCard(cardId: string, zone: string, index: number): CardInstance {
      return faceDownCard(`dev-catalog-${seat}-${zone}-${index}`, cardId, seat);
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
            catalogPermanent("you-bwg-base", ["BT1-024"]),
            catalogPermanent("you-leopard-base", ["BT3-053"]),
            catalogPermanent("you-yuuko", ["BT22-083"]),
          ]
        : [catalogPermanent("opponent-attacker", ["BT12-069"]), catalogPermanent("opponent-cost-7", ["BT10-065"])];
    field.forEach((entry) => placePermanent(player, entry));
    if (seat === 1) field[1]!.isSuspended = true;
    const hand = seat === 0 ? ["EX10-010", "BT22-052", "BT1-013"] : [];
    hand.forEach((cardId, index) =>
      insertCard(player, Zone.Hand, seat === 0 ? catalogCard(cardId, "hand", index) : take(cardId)),
    );
    const trash: string[] = [];
    trash.forEach((cardId, index) =>
      insertCard(player, Zone.Trash, seat === 0 ? catalogCard(cardId, "trash", index) : take(cardId)),
    );
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
  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/**
 * Reproduces BT26-033's two faces in one short line. Dan & Kanan raise the human from 1 to
 * 2 memory at the start of main phase. One Jupitermon can then digivolve over Sirenmon for
 * 4, remove the sole security card, and leave the opponent at 2 memory; at end of turn the
 * second copy's now-2 use cost is low enough for Dan & Kanan to use Wide Plasment for free.
 */
function layJupitermonSirenScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    if (seat === 1) setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT25-039"], "-sirenmon"));
    placePermanent(human, establishedDigimon(0, ["BT24-085"], "-dan-kanan"));
    insertCard(human, Zone.Hand, faceDownCard("dev-jupitermon-digivolve", "BT26-033", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-jupitermon-option", "BT26-033", 0));
    insertCard(human, Zone.Security, faceDownCard("dev-jupitermon-security", "BT1-009", 0));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 1;
}

/**
 * Reproduces EX13-060 Alphamon and EX13-057 Grademon's simultaneous trigger ordering.
 * Play Grademon, activate Alphamon first, and use Alphamon to make the newly played
 * Grademon attack. Grademon's still-pending [On Play] effect should then resolve during
 * that attack and grant the selected Chronicle Digimon immunity and +5000 DP.
 */
function layEx13GrademonImmunityScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX13-060"], "-ex13-alphamon"));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-grademon", "EX13-057", 0));
  }

  const opponent = state.players[1];
  if (opponent !== undefined) {
    const attackTarget = establishedDigimon(1, ["BT1-080"], "-grademon-attack-target");
    attackTarget.isSuspended = true;
    placePermanent(opponent, attackTarget);
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
}

/** Reproduces simultaneous [When Attacking] and optional [All Turns] Vortexdramon triggers. */
function layVortexdramonScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    const permanent = (id: string, cardId: string): Permanent => {
      const result = establishedDigimon(seat, [cardId], `-${id}`);
      result.permanentId = id;
      return result;
    };
    const field =
      seat === 0
        ? [permanent("you-vortexdramon", "EX11-074"), permanent("you-trigger-ally", "BT1-014")]
        : [permanent("opponent-target-a", "BT1-080"), permanent("opponent-target-b", "BT1-081")];
    field.forEach((entry) => placePermanent(player, entry));
    if (seat === 1) field[0]!.isSuspended = true;
    setSecurityStack(player);
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/** Sonic Shot phase-lock versus Magnamon X's immediate and security-triggered unsuspends. */
function layMagnamonXScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    const permanent = (id: string, cardId: string): Permanent => {
      const result = establishedDigimon(seat, [cardId], `-${id}`);
      result.permanentId = id;
      return result;
    };
    const field =
      seat === 0
        ? [permanent("you-magnamon-base", "BT21-036"), permanent("you-security-attacker", "BT1-009")]
        : [permanent("opponent-security-attacker", "BT1-009")];
    field.forEach((entry) => placePermanent(player, entry));
    if (seat === 0) insertCard(player, Zone.Hand, faceDownCard("dev-magnamon-x", "BT16-102", seat));
    setSecurityStack(player);
    if (seat === 1) {
      const displaced = takeBottom(player, Zone.Security);
      if (displaced !== undefined) insertCard(player, Zone.Deck, displaced);
      insertCard(player, Zone.Security, faceDownCard("dev-sonic-shot", "BT24-095", seat), "top");
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
}

/** Wizardmon's end-of-turn trash play offering Aegiochusmon: Dark's Assembly material. */
function layAegiochusDarkAssemblyScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    const permanent = (id: string, cardId: string): Permanent => {
      const result = establishedDigimon(seat, [cardId], `-${id}`);
      result.permanentId = id;
      return result;
    };
    const field =
      seat === 0
        ? [permanent("you-wizardmon", "BT26-067"), permanent("you-yellow-digimon", "BT1-045")]
        : [permanent("opponent-level-5", "BT26-074")];
    field.forEach((entry) => placePermanent(player, entry));
    if (seat === 0) {
      insertCard(player, Zone.Trash, faceUpCard("dev-aegiochus-dark", "BT26-073", seat));
      insertCard(player, Zone.Trash, faceUpCard("dev-coronamon", "BT25-008", seat));
      insertCard(player, Zone.Trash, faceUpCard("dev-assembly-material", "BT26-069", seat));
    }
    setSecurityStack(player);
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 2;
}

/**
 * Reproduces the EX13 Examon report from a board where its printed DNA action should already
 * be legal. Wingdramon and Groundramon are printed Lv.5s, but each treats itself as the named
 * Lv.6 material for an Examon DNA digivolution. EX13 Dracomon sits under Wingdramon so ending
 * the turn also preserves the reported fallback path through its inherited DNA effect.
 *
 * After the DNA digivolution, Examon's forced attack can target security while its following
 * optional battle still has a real opposing Digimon to select. This makes it possible to see
 * whether that battle resolves before Examon's two security checks.
 */
function layEx13ExamonScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX13-008", "EX13-021"], "-ex13-wingdramon"));
    placePermanent(human, establishedDigimon(0, ["EX13-041"], "-ex13-groundramon"));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-examon", "EX13-045", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-dragon-option", "BT20-093", 0));
  }

  const opponent = state.players[1];
  if (opponent !== undefined) {
    const battleTarget = establishedDigimon(1, ["BT1-080"], "-ex13-battle-target");
    battleTarget.isSuspended = true;
    placePermanent(opponent, battleTarget);
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
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

/**
 * The check from match 87554e93, laid out so the bot reproduces it on its first turn.
 *
 * The point is the GAP. The engine closes a security check only once everything that check
 * caused has resolved, so an attacker that dies to the revealed Digimon and then fires an
 * [On Deletion] that stops to ask a question puts several seconds between `securityRevealed`
 * and `securityChecked`. In the logged match that gap was 2.7 s, and the client used to let
 * the revealed card play out and leave inside it — showing the attacker's death long before
 * the blow that dealt it, then flashing the card back for its outcome beat.
 *
 * Gazimon (Lv.4, 5000 DP) attacks into Susanoomon (Lv.7, 16000 DP) and loses. Its own
 * [On Deletion] and the DemiMeramon DigiEgg's inherited one both ask the bot to pay, and the
 * level 6 in its hand makes the DigiEgg's payment a real question rather than a dead option.
 */
const DELAYED_BATTLE_ATTACKER_CARDS: readonly string[] = ["BT15-006", "BT19-069"];
const DELAYED_BATTLE_SECURITY_CARD = "EX12-076";
/** Level 5+ in the bot's hand, so the [On Deletion] that holds the check open can be paid. */
const DELAYED_BATTLE_BOT_HAND_CARD = "BT24-017";

/**
 * The same gap, opened twice over. `security-battle` asks the bot one question and holds the
 * check for roughly one think time; production hit a check that asked two in a row and held it
 * for 5.3 s, which is the shape worth watching because it is the one the single-question board
 * does not reach.
 *
 * ZeigGreymon (Lv.6, 11000 DP) attacks into Susanoomon (Lv.7, 16000 DP) and loses. Its
 * [All Turns] "would leave the battle area" clause asks the bot to accept the replacement and
 * then to pick which Digimon to play from its own digivolution cards — two decisions, back to
 * back, both inside the open check. Shoutmon (Lv.3) and OmniShoutmon (Lv.5) sit under it so the
 * pick has two real candidates; the Pickmons DigiEgg under both carries the inherited
 * [When Attacking] draw, so the attack also opens with an effect of its own.
 *
 * Listed bottom to top, matching the production stack card for card.
 */
const SECURITY_CHAIN_ATTACKER_CARDS: readonly string[] = ["BT10-003", "BT19-008", "BT21-021", "AD1-013"];

function layDelayedSecurityBattleScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  laySecurityCheckScenario(state, decks, DELAYED_BATTLE_ATTACKER_CARDS, DELAYED_BATTLE_BOT_HAND_CARD);
}

/** The two-question variant. See `SECURITY_CHAIN_ATTACKER_CARDS`. */
function laySecurityChainScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  laySecurityCheckScenario(state, decks, SECURITY_CHAIN_ATTACKER_CARDS);
}

/**
 * Both security-check boards: the viewer holds the oversized Digimon on top of security, the
 * bot holds the turn and an established attacker that loses to it. Only the attacker — and
 * whatever its clauses need in hand — tells the two apart.
 */
function laySecurityCheckScenario(
  state: GameState,
  decks: readonly [Decklist, Decklist],
  attackerCards: readonly string[],
  botHandCard?: string,
): void {
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
  }
  const human = state.players[0];
  if (human !== undefined) {
    // The revealed card: a Digimon far too big to lose, and with no [Security] clause of its
    // own, so the battle is the only thing the check has left to show.
    insertCard(human, Zone.Security, faceDownCard("dev-security-0", DELAYED_BATTLE_SECURITY_CARD, 0), "top");
    takeBottom(human, Zone.Security);
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, attackerCards));
    if (botHandCard !== undefined) insertCard(bot, Zone.Hand, faceDownCard("dev-hand-1", botHandCard, 1));
  }
  // The bot takes the turn, so the check that runs is the one against the viewer's security.
  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

const LAYOUTS: Record<DevScenarioId, typeof layBattleScenario> = {
  battle: layBattleScenario,
  arena: layArenaScenario,
  "arena-aegiochus-dark-assembly": layAegiochusDarkAssemblyScenario,
  "arena-ex13-grademon-immunity": layEx13GrademonImmunityScenario,
  "arena-ex13-examon": layEx13ExamonScenario,
  "arena-jupitermon-siren": layJupitermonSirenScenario,
  "arena-magnamon-x": layMagnamonXScenario,
  "arena-vortexdramon": layVortexdramonScenario,
  "card-bugs": layCardBugsScenario,
  "security-battle": layDelayedSecurityBattleScenario,
  "security-chain": laySecurityChainScenario,
};

export function layDevScenario(scenario: DevScenarioId, state: GameState, decks: readonly [Decklist, Decklist]): void {
  LAYOUTS[scenario](state, decks);
}
