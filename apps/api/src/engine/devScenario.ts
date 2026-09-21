import { CardInstance, Permanent, Zone, getCardDefinition, type GameState, type Seat } from "@aegis/shared";
import {
  extractCardAt,
  insertCard,
  linkCard,
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
  "arena-alliance-20",
  "arena-bt21-davis-top-stack",
  "arena-face-up-security",
  "arena-ex13-grademon-immunity",
  "arena-ex13-gotsumon-blocker-search",
  "arena-ex13-giromon-block-triggers",
  "arena-ex13-deletion-trigger-ordering",
  "arena-ex13-kings-opponent-sukamon",
  "arena-ex13-kingsukamon-immunity-lapse",
  "arena-ex13-examon",
  "arena-ex5-attack-priority",
  "arena-ex10-god-grade-raising-color",
  "arena-issue-4888-app-fusion",
  "arena-issue-4889-weregarurumon-dna",
  "arena-issue-4890-reina-deletion",
  "arena-issue-4891-seiten-on-play",
  "arena-issue-4892-effect-digixros",
  "arena-issue-4893-seiten-evo-cost",
  "arena-junomon-opponent-target",
  "arena-jupitermon-siren",
  "arena-magnamon-x",
  "arena-reboot-timing",
  "arena-sagasol-effect-assembly",
  "arena-sagasol-etemon-protected-dp",
  "arena-sagasol-guard-source",
  "arena-ex13-magnamon-end-turn",
  "arena-seven-code-link-dp",
  "arena-suspend-lock-block",
  "arena-vortex-target-legality",
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

/** Seed a link card while keeping the scenario's serialized DP projection internally consistent. */
function linkEstablishedCard(permanent: Permanent, card: CardInstance): void {
  linkCard(permanent, card, "bottom");
  permanent.currentDP += getCardDefinition(card.cardId)?.linkDp ?? 0;
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

/** Stresses the Alliance ally picker with one attacker and 19 eligible allies. */
function layAllianceTwentyScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT23-020"], "-alliance-attacker"));
    for (let index = 1; index < 20; index += 1) {
      placePermanent(human, establishedDigimon(0, ["BT1-010"], `-alliance-ally-${index}`));
    }
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/** Reproduces turn-player attack triggers resolving before EX5 opponent-attack reactions. */
function layEx5AttackPriorityScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    // Betsumon's inherited +1000 DP keeps MetalEtemon above Shoutmon EX6's printed 12000 DP,
    // so Shoutmon's deletion resolves visibly without removing either EX5 reaction source.
    const metalEtemon = establishedDigimon(0, ["BT12-067", "EX5-048", "EX5-054"], "-ex5-priority");
    metalEtemon.permanentId = "you-ex5-metal-etemon";
    placePermanent(human, metalEtemon);
    insertCard(human, Zone.Hand, faceDownCard("dev-ex5-redirect-cost", "BT11-040", 0));
    insertCard(human, Zone.Deck, faceDownCard("dev-ex5-reveal-three", "BT1-012", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-ex5-reveal-two", "BT1-010", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-ex5-reveal-one", "BT11-040", 0), "top");
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    const attacker = establishedDigimon(1, ["BT19-014"], "-ex5-priority-attacker");
    attacker.permanentId = "opponent-shoutmon-ex6";
    placePermanent(bot, attacker);
    const ally = establishedDigimon(1, ["BT1-012"], "-ex5-priority-ally");
    ally.permanentId = "opponent-alliance-ally";
    // It may pay Alliance's suspension cost, but summoning sickness keeps the bot from
    // choosing this vanilla body as the attacker instead of Shoutmon EX6.
    ally.enterFieldTurnCount = 1;
    placePermanent(bot, ally);
  }

  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/** Reproduces BT21-085 selecting Veemon under an Armor Form instead of the visible top card. */
function layBt21DavisTopStackScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT21-085"], "-bt21-davis"));
    placePermanent(human, establishedDigimon(0, ["BT3-021", "BT21-036"], "-bt21-armor"));
    insertCard(human, Zone.Deck, faceDownCard("dev-bt21-davis-effect-draw", "BT1-011", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-bt21-davis-turn-draw", "BT1-010", 0), "top");
  }

  const opponent = state.players[1];
  if (opponent !== undefined) {
    placePermanent(opponent, establishedDigimon(1, ["BT1-009"], "-bt21-davis-opponent"));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/** Attack with both Digimon, then pass: Magnamon resolves before the opponent's Reboot window. */
function layEx13MagnamonEndTurnScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
    if (seat === 1) {
      // Neutral security lets both attackers survive without opening unrelated effects.
      while (player.security.length > 0) {
        const displaced = takeBottom(player, Zone.Security);
        if (displaced !== undefined) insertCard(player, Zone.Deck, displaced);
      }
      for (let index = 0; index < 5; index += 1) {
        insertCard(player, Zone.Security, faceDownCard(`magnamon-security-${index}`, "BT1-029", seat));
      }
    }
  }
  const human = state.players[0];
  if (human !== undefined) {
    const magnamon = establishedDigimon(0, ["BT2-021", "EX13-020"], "-end-turn");
    magnamon.permanentId = "you-ex13-magnamon";
    placePermanent(human, magnamon);
    const reboot = establishedDigimon(0, ["BT4-070"], "-end-turn-reboot");
    reboot.permanentId = "you-reboot-meteormon";
    placePermanent(human, reboot);
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/** Starts the human's turn with only suspended ＜Reboot＞ Digimon on their battle area. */
function layRebootTimingScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const field: ReadonlyArray<readonly [Seat, string, string]> = [
    [0, "reboot-meteormon", "BT4-070"],
    [0, "reboot-blackwargreymon", "BT5-069"],
    [1, "opponent-garurumon-one", "ST2-06"],
    [1, "opponent-garurumon-two", "ST2-06"],
    [1, "opponent-control", "BT1-024"],
  ];
  for (const [seat, permanentId, cardId] of field) {
    const permanent = establishedDigimon(seat, [cardId]);
    permanent.permanentId = permanentId;
    permanent.isSuspended = true;
    placePermanent(state.players[seat]!, permanent);
  }

  state.turnSeat = 0;
  state.turnCount = 0;
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

/** Reproduces the opponent view of a mixed security stack with public, face-up cards. */
function layFaceUpSecurityScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  layArenaScenario(state, decks);
  const opponent = state.players[1];
  if (opponent === undefined) return;
  for (const card of opponent.security.slice(0, 2)) card.faceUp = true;
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

/** BT25-044 Junomon [On Play]: the opponent's Digimon must be offered for its placement cost. */
function layJunomonOpponentTargetScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-junomon", "BT25-044", 0));
  }

  const opponent = state.players[1];
  if (opponent !== undefined) {
    placePermanent(opponent, establishedDigimon(1, ["BT1-009"], "-junomon-opponent-target"));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
}

/** SagaSol regression: HiAndromon reveals Megadramon, which may Assembly from trash. */
function laySagaSolEffectAssemblyScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-sagasol-hiandromon", "EX12-058", 0));
    insertCard(human, Zone.Deck, faceDownCard("dev-sagasol-reveal-filler-2", "BT1-014", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-sagasol-reveal-filler-1", "BT1-009", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-sagasol-megadramon", "EX12-064", 0), "top");
    // Turn 1's Draw phase consumes this card, leaving Megadramon on top for HiAndromon's reveal.
    insertCard(human, Zone.Deck, faceDownCard("dev-sagasol-draw-buffer", "BT1-012", 0), "top");
    insertCard(human, Zone.Trash, faceUpCard("dev-sagasol-assembly-material", "EX12-054", 0));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 11;
}

/** SagaSol regression: EX5 Etemon's DP reduction is retained while its target is unaffected. */
function laySagaSolEtemonProtectedDpScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-sagasol-etemon", "EX5-048", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-sagasol-action-buffer", "BT1-009", 0));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    const protectedTarget = establishedDigimon(1, ["BT15-047"], "-sagasol-protected-dp-target");
    protectedTarget.permanentId = "opponent-sagasol-protected-dp-target";
    protectedTarget.isSuspended = true;
    placePermanent(bot, protectedTarget);
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
}

/** SagaSol regression: Metal Empire must own the Guard prompt it grants from security. */
function laySagaSolGuardSourceScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX12-064"], "-sagasol-protected"));
    // The bot deterministically picks the first legal Gaia Force target. Put the protected
    // Megadramon first and ToyAgumon second so ToyAgumon can pay the granted Guard cost.
    placePermanent(human, establishedDigimon(0, ["EX12-008"], "-sagasol-guard"));
    insertCard(human, Zone.Security, faceUpCard("dev-sagasol-metal-empire", "EX12-072", 0), "top");
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    // Gaia Force still has its normal red use requirement. Give the bot a red source so
    // it actually uses the Option instead of passing with 10 memory and never opening Guard.
    // A Tamer satisfies the color requirement without giving the bot an attacker that could
    // remove the face-up Metal Empire from security before Gaia Force is used.
    placePermanent(bot, establishedDigimon(1, ["BT1-085"], "-sagasol-red-source"));
    insertCard(bot, Zone.Hand, faceDownCard("dev-sagasol-gaia-force", "ST1-16", 1));
  }
  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
}

/** Stages EX13-060 Alphamon's three-card [Assembly -5] route from the trash. */
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
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-alphamon", "EX13-060", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-grademon-hand", "EX13-057", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-ex13-assembly-lv5", "EX13-057", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-ex13-assembly-lv4", "EX13-055", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-ex13-assembly-lv3", "EX13-049", 0));
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
  state.memory = 3;
}

/** EX13-047 must find main-text ＜Blocker＞, not a keyword printed only as an inherited effect. */
function layEx13GotsumonBlockerSearchScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-gotsumon", "EX13-047", 0));
    // Insert in reverse because deck[0] is the top card. The neutral card absorbs the turn draw.
    insertCard(human, Zone.Deck, faceDownCard("dev-gotsumon-inherited-blocker-ex8", "EX8-046", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-gotsumon-inherited-blocker-bt19", "BT19-069", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-gotsumon-main-blocker", "BT20-047", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-gotsumon-turn-draw", "BT1-009", 0), "top");
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
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

/** Vortex target picker: only the opponent's suspended Digimon is a legal attack target. */
function layVortexTargetLegalityScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    const attacker = establishedDigimon(0, ["EX7-034"], "-vortex-target-attacker");
    attacker.permanentId = "you-vortex-target-attacker";
    placePermanent(human, attacker);
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    const validTarget = establishedDigimon(1, ["BT1-080"], "-vortex-valid-target");
    validTarget.permanentId = "opponent-vortex-valid-target";
    validTarget.isSuspended = true;
    placePermanent(bot, validTarget);

    const invalidTarget = establishedDigimon(1, ["BT1-081"], "-vortex-invalid-target");
    invalidTarget.permanentId = "opponent-vortex-invalid-target";
    placePermanent(bot, invalidTarget);
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

/** A plain bot attacker opposite a real ＜Blocker＞; match startup applies the suspend lock. */
/**
 * Reproduces the BT26 Seven Code Link DP report as a three-way comparison:
 * Medicmon receives a known +2000 DP from BT21 Gatchmon (control), Globemon receives
 * Weatherdramon's expected +3000 Link DP, and Weatherdramon receives Medicmon's expected
 * +3000 Link DP. The real engine performs the continuous-DP recomputation after startup.
 */
function laySevenCodeLinkDpScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    const receivingControl = establishedDigimon(0, ["BT26-028"], "-seven-code-receiving-control");
    linkEstablishedCard(receivingControl, faceUpCard("dev-link-bt21-gatchmon", "BT21-009", 0));
    placePermanent(human, receivingControl);

    const sevenCodeGiving = establishedDigimon(0, ["BT21-023"], "-seven-code-giving");
    linkEstablishedCard(sevenCodeGiving, faceUpCard("dev-link-weatherdramon", "BT26-037", 0));
    placePermanent(human, sevenCodeGiving);

    const sevenCodeBoth = establishedDigimon(0, ["BT26-037"], "-seven-code-both");
    linkEstablishedCard(sevenCodeBoth, faceUpCard("dev-link-medicmon", "BT26-028", 0));
    placePermanent(human, sevenCodeBoth);
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

function laySuspendLockBlockScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["ST18-07"], "-suspend-locked-blocker"));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["AD1-001"], "-suspend-lock-attacker"));
  }

  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/**
 * Reproduces the EX13 Craniamon-deck block report: Giromon blocks with EX13 Guardromon
 * underneath it, two more EX13 Giromon beside it, and four ST15 Tai Kamiya Tamers watching
 * the attack target switch. Suspending Giromon therefore creates six simultaneous effects
 * for the defending player to order:
 * Giromon's reveal, Guardromon's inherited unsuspend, and one draw/DP effect from each Tai.
 *
 * The top three cards are fixed so Giromon's reveal also shows Black Scramble going to the
 * trash while Gotsumon is a legal Blocker to play. A Guardromon in hand makes the inherited
 * Giromon effect actionable after the initial trigger-order window.
 */
function layEx13GiromonBlockTriggersScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX13-051", "EX13-056"], "-ex13-giromon-blocker"));
    placePermanent(human, establishedDigimon(0, ["EX13-056"], "-ex13-field-giromon-a"));
    placePermanent(human, establishedDigimon(0, ["EX13-056"], "-ex13-field-giromon-b"));
    placePermanent(human, establishedDigimon(0, ["ST15-14"], "-ex13-tai-a"));
    placePermanent(human, establishedDigimon(0, ["ST15-14"], "-ex13-tai-b"));
    placePermanent(human, establishedDigimon(0, ["ST15-14"], "-ex13-tai-c"));
    placePermanent(human, establishedDigimon(0, ["ST15-14"], "-ex13-tai-d"));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-hand-guardromon", "EX13-051", 0));

    // insertCard(..., "top") prepends, so seed these in reverse reveal order.
    insertCard(human, Zone.Deck, faceDownCard("dev-ex13-reveal-craniamon", "EX13-062", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-ex13-reveal-gotsumon", "EX13-047", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-ex13-reveal-black-scramble", "LM-031", 0), "top");
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["ST1-10"], "-ex13-block-trigger-attacker"));
  }

  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/** KingSukamon rewrites an opponent that EX13-035 then rule-deletes at 0 DP. */
function layEx13KingSukamonZeroDpScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX13-031", "BT1-013"], "-ex13-kingsukamon-host"));
    placePermanent(human, establishedDigimon(0, ["EX13-035"], "-ex13-kingsukamon-aura"));
    placePermanent(human, establishedDigimon(0, ["BT14-034"], "-ex13-kingsukamon-first-name"));
    placePermanent(human, establishedDigimon(0, ["BT13-065"], "-ex13-kingsukamon-second-name"));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-kingsukamon", "EX13-031", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-kingsukamon-fee", "BT3-061", 0));

    // insertCard(..., "top") prepends, so seed these in reverse reveal order.
    insertCard(human, Zone.Deck, faceDownCard("dev-ex13-kingsukamon-reveal-third", "BT1-014", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-ex13-kingsukamon-reveal-second", "BT1-009", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-ex13-kingsukamon-reveal-chuumon", "BT13-062", 0), "top");
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    const target = establishedDigimon(1, ["ST15-11"], "-ex13-kingsukamon-target");
    target.permanentId = "opponent-kingsukamon-zero-dp-target";
    placePermanent(bot, target);
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 7;
}

/** Reproduces native [On Deletion] versus KingSukamon's inherited deletion watcher. */
function layEx13DeletionTriggerOrderingScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX13-031", "EX13-035"], "-ex13-deletion-order-host"));
    placePermanent(human, establishedDigimon(0, ["EX13-028"], "-ex13-deletion-order-sukamon"));
    placePermanent(human, establishedDigimon(0, ["BT2-067"], "-ex13-deletion-order-purple"));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-deletion-order-option", "BT2-109", 0));

    // Each simultaneous reveal gets a distinct legal first card, making chosen order visible.
    for (const [suffix, cardId] of [
      ["sixth", "BT1-014"],
      ["fifth", "BT1-009"],
      ["second-chuumon", "BT13-062"],
      ["third", "BT1-014"],
      ["second", "BT1-009"],
      ["first-sukamon", "EX13-028"],
    ] as const) {
      insertCard(human, Zone.Deck, faceDownCard(`dev-ex13-deletion-order-${suffix}`, cardId, 0), "top");
    }
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-ex13-deletion-order-target-one"));
    placePermanent(bot, establishedDigimon(1, ["BT1-010"], "-ex13-deletion-order-target-two"));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/** Proves both EX13 kings count and react to [Sukamon]-named Digimon on the opponent's field. */
function layEx13KingsOpponentSukamonScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX13-031", "EX13-035"], "-ex13-kings"));

    // insertCard(..., "top") prepends, so seed these in reverse reveal order. Only Sukamon
    // is a legal play for KingSukamon's inherited reveal.
    insertCard(human, Zone.Deck, faceDownCard("dev-ex13-kings-reveal-third", "BT1-014", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-ex13-kings-reveal-second", "BT1-013", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-ex13-kings-reveal-sukamon", "EX13-028", 0), "top");
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    const battleTarget = establishedDigimon(1, ["BT13-069"], "-ex13-kings-battle-target");
    battleTarget.permanentId = "opponent-sukamon-battle-target";
    battleTarget.isSuspended = true;
    placePermanent(bot, battleTarget);

    const thresholdWitness = establishedDigimon(1, ["BT13-069"], "-ex13-kings-threshold-witness");
    thresholdWitness.permanentId = "opponent-sukamon-threshold-witness";
    placePermanent(bot, thresholdWitness);
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/** Compares two off-colour Options while BT26 Copipemon is the only Appmon in breeding. */
function layEx10GodGradeRaisingColorScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    const copipemon = establishedDigimon(0, ["BT26-084"], "-god-grade-copipemon");
    copipemon.inBreeding = true;
    setBreeding(human, copipemon);
    insertCard(human, Zone.Hand, faceDownCard("dev-god-grade-unleashed", "EX10-070", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-cyber-engage", "BT25-098", 0));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

function prepareIssueScenario(state: GameState, decks: readonly [Decklist, Decklist], memory: number): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = memory;
}

function layIssue4888AppFusionScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 0);
  const human = state.players[0];
  if (human === undefined) return;
  const host = establishedDigimon(0, ["EX10-016"], "-issue-4888-host");
  linkEstablishedCard(host, faceUpCard("dev-issue-4888-copipemon", "EX10-038", 0));
  placePermanent(human, host);
  insertCard(human, Zone.Hand, faceDownCard("dev-issue-4888-mienumon", "EX10-017", 0));
}

function layIssue4889WereGarurumonDnaScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 0);
  const human = state.players[0];
  if (human === undefined) return;
  placePermanent(human, establishedDigimon(0, ["EX8-032"], "-issue-4889-apemon"));
  placePermanent(human, establishedDigimon(0, ["EX12-024"], "-issue-4889-garurumon"));
  insertCard(human, Zone.Hand, faceDownCard("dev-issue-4889-weregarurumon", "EX12-032", 0));
}

function layIssue4890ReinaDeletionScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 5);
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX11-059"], "-issue-4890-reina"));
    placePermanent(human, establishedDigimon(0, ["EX8-060"], "-issue-4890-myotismon"));
    placePermanent(human, establishedDigimon(0, ["EX8-062"], "-issue-4890-piedmon"));
    placePermanent(human, establishedDigimon(0, ["EX12-032"], "-issue-4890-weregarurumon"));
    insertCard(human, Zone.Hand, faceDownCard("dev-issue-4890-heat-viper", "BT2-109", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-issue-4890-granddracmon", "EX8-064", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-issue-4890-target-a"));
    placePermanent(bot, establishedDigimon(1, ["BT1-010"], "-issue-4890-target-b"));
  }
}

function layIssue4891SeitenOnPlayScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 13);
  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-issue-4891-seiten", "EX12-048", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) placePermanent(bot, establishedDigimon(1, ["BT1-024"], "-issue-4891-target"));
}

function layIssue4892EffectDigiXrosScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 3);
  const human = state.players[0];
  if (human === undefined) return;
  placePermanent(human, establishedDigimon(0, ["EX12-043"], "-issue-4892-hakubamon"));
  insertCard(human, Zone.Hand, faceDownCard("dev-issue-4892-gokuumon", "EX12-015", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-issue-4892-material", "EX12-006", 0));
}

function layIssue4893SeitenEvoCostScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 4);
  const human = state.players[0];
  if (human === undefined) return;
  placePermanent(human, establishedDigimon(0, ["EX12-015"], "-issue-4893-gokuumon"));
  insertCard(human, Zone.Hand, faceDownCard("dev-issue-4893-seiten", "EX12-048", 0));
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
  "arena-alliance-20": layAllianceTwentyScenario,
  "arena-bt21-davis-top-stack": layBt21DavisTopStackScenario,
  "arena-face-up-security": layFaceUpSecurityScenario,
  "arena-ex13-grademon-immunity": layEx13GrademonImmunityScenario,
  "arena-ex13-gotsumon-blocker-search": layEx13GotsumonBlockerSearchScenario,
  "arena-ex13-giromon-block-triggers": layEx13GiromonBlockTriggersScenario,
  "arena-ex13-deletion-trigger-ordering": layEx13DeletionTriggerOrderingScenario,
  "arena-ex13-kings-opponent-sukamon": layEx13KingsOpponentSukamonScenario,
  "arena-ex13-kingsukamon-immunity-lapse": layEx13KingSukamonZeroDpScenario,
  "arena-ex13-examon": layEx13ExamonScenario,
  "arena-ex5-attack-priority": layEx5AttackPriorityScenario,
  "arena-ex10-god-grade-raising-color": layEx10GodGradeRaisingColorScenario,
  "arena-issue-4888-app-fusion": layIssue4888AppFusionScenario,
  "arena-issue-4889-weregarurumon-dna": layIssue4889WereGarurumonDnaScenario,
  "arena-issue-4890-reina-deletion": layIssue4890ReinaDeletionScenario,
  "arena-issue-4891-seiten-on-play": layIssue4891SeitenOnPlayScenario,
  "arena-issue-4892-effect-digixros": layIssue4892EffectDigiXrosScenario,
  "arena-issue-4893-seiten-evo-cost": layIssue4893SeitenEvoCostScenario,
  "arena-junomon-opponent-target": layJunomonOpponentTargetScenario,
  "arena-jupitermon-siren": layJupitermonSirenScenario,
  "arena-magnamon-x": layMagnamonXScenario,
  "arena-reboot-timing": layRebootTimingScenario,
  "arena-sagasol-effect-assembly": laySagaSolEffectAssemblyScenario,
  "arena-sagasol-etemon-protected-dp": laySagaSolEtemonProtectedDpScenario,
  "arena-sagasol-guard-source": laySagaSolGuardSourceScenario,
  "arena-ex13-magnamon-end-turn": layEx13MagnamonEndTurnScenario,
  "arena-seven-code-link-dp": laySevenCodeLinkDpScenario,
  "arena-suspend-lock-block": laySuspendLockBlockScenario,
  "arena-vortex-target-legality": layVortexTargetLegalityScenario,
  "arena-vortexdramon": layVortexdramonScenario,
  "card-bugs": layCardBugsScenario,
  "security-battle": layDelayedSecurityBattleScenario,
  "security-chain": laySecurityChainScenario,
};

export function layDevScenario(scenario: DevScenarioId, state: GameState, decks: readonly [Decklist, Decklist]): void {
  LAYOUTS[scenario](state, decks);
}
