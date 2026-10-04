import {
  CATALOG_DECKS,
  CardKind,
  CardInstance,
  Permanent,
  Zone,
  getCardDefinition,
  type GameState,
  type Seat,
} from "@aegis/shared";
import {
  extractCardAt,
  fillZone,
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
  "arena-taiki-digixros-any-tamer-hand",
  "arena-kotone-digixros-any-tamer-effect",
  "arena-mervamon-trash-digixros",
  "arena-bt26-monimon-optional-cost",
  "arena-diarbbitmon-dual-option-immunity",
  "battle",
  "field-grouping",
  "arena-field-grouping-dense",
  "arena",
  "arena-aegiochus-dark-assembly",
  "arena-alliance-20",
  "arena-marcus-alliance",
  "arena-bt11-analogman-redirect-timing",
  "arena-bt11-rina-ulforce-immunity",
  "arena-bt11-rina-ulforce-effect-choice",
  "arena-rina-evade-unsuspend",
  "arena-ex3-wingdramon-evade-suspend-lock",
  "arena-ex13-wingdramon-evade-suspend-lock",
  "arena-bt20-grademon-redirect",
  "arena-bt20-bakemon-violet-retroactive",
  "arena-bt23-bakemon-no-target",
  "arena-bt20-invisimon-empty-stack",
  "arena-bt20-invisimon-stacked",
  "arena-bt20-takemikazuchi-turn-continue",
  "arena-bt16-phoenixmon-x-antibody-name",
  "arena-bt21-davis-top-stack",
  "arena-bt21-dracomon-start-main",
  "arena-bt21-dogatchmon-link-attack",
  "arena-bt24-sonic-shot-decline-link",
  "arena-bt26-chronomon-dm-succession",
  "arena-bt8-digimon-emperor-breeding-memory",
  "arena-face-up-security",
  "arena-ex13-grademon-immunity",
  "arena-ex7-seventh-fascination-turn",
  "arena-ad1-adventure-tamers-security",
  "arena-lm067-gundramon-free-option",
  "arena-bt10-taiki-x7-xros-heart",
  "arena-ex13-sampson-face-down-sources",
  "arena-p240-arcturusmon-vb-routes",
  "arena-p240-arcturusmon-ordered-placement",
  "arena-ex12-proximamon-dual-siriusmon",
  "arena-ex12-siriusmon-group-placement",
  "arena-ex12-virus-busters-effect-attack",
  "arena-ex12-diarbbitmon-option-trigger-timing",
  "arena-bt15-leviamon-x-played-subject-left",
  "arena-ex7-seventh-fascination-trash-turn",
  "arena-ex13-leopardmon-suspended-target",
  "arena-ex13-leopardmon-unsuspend-lock",
  "arena-ex13-breakdramon-zero-security-check",
  "arena-decoy-protect-choice",
  "arena-p245-kakkinmon-full-hand-suspend",
  "arena-ex13-alphamon-end-turn-attack",
  "arena-bt20-dragon-gene-skip-play",
  "arena-bt26-rosemon-option-digivolve-lock",
  "arena-bt26-ravemon-nested-on-deletion",
  "arena-bt26-yoshino-trigger-stack",
  "arena-bt26-ravemon-recycled-trigger",
  "arena-bt26-yoshino-match-b3759aa7",
  "arena-bt22-rie-kishibe-delete-without-digivolve",
  "arena-bt24-fugamon-self-trash",
  "arena-bt2-kurisarimon-repeat-memory",
  "arena-bt2-kurisarimon-start-main-memory",
  "arena-ex12-metalgarurumon-trash-then-return",
  "arena-bt22-palmon-cs-restack",
  "arena-bt22-mirei-play-cost-floor",
  "arena-bt12-mikemon-own-battle-only",
  "arena-bt14-chuumon-security-reveal",
  "arena-bt20-omnimon-each-player-survivor",
  "arena-bt20-ouryuken-reduction-resumes",
  "arena-ex13-gotsumon-blocker-search",
  "arena-ex13-craniamon-assembly",
  "arena-p220-millenniummon-assembly",
  "arena-ex9-kimeramon-skullgreymon-assembly",
  "arena-bt24-masterblimpmon-assembly",
  "arena-bt22-boltmon-assembly",
  "arena-ex13-gotsumon-promo-knightmon",
  "arena-rainbow-evo-cost",
  "arena-sukamon-transform-digivolve-viewer",
  "arena-sukamon-transform-digivolve",
  "arena-mightyaxe-mode-digixros",
  "arena-hand-reconnect-sync",
  "arena-p097-zubamon-reveal-order",
  "arena-p246-motimon-kingetemon",
  "arena-p246-motimon-after-de-digivolve",
  "arena-de-digivolve-visibility",
  "arena-st24-dna-charge-start-of-main",
  "arena-ex13-giromon-block-triggers",
  "arena-ex13-kentaurosmon-each-player-security",
  "arena-ex13-kentaurosmon-two-counters",
  "arena-ex13-deletion-trigger-ordering",
  "arena-gate-deadly-sins-effect-order",
  "arena-rika-optional-effect-presets",
  "arena-davis-optional-effect-presets",
  "arena-ukkomon-optional-effect-presets",
  "arena-drasil-optional-effect-presets",
  "arena-matt-repeated-effect-presets",
  "arena-ex13-kings-opponent-sukamon",
  "arena-ex13-kingsukamon-immunity-lapse",
  "arena-ex12-susanoomon-later-arrival-dp",
  "arena-ex13-kingsukamon-machinedramon-dp",
  "arena-ex13-kingsukamon-vulcanusmon-link",
  "arena-ex13-examon",
  "arena-ex13-examon-battle-win-timing",
  "arena-bt23-examon-opponent-turn-dna",
  "arena-ex13-chirinmon-cost-choice",
  "arena-ex13-wisemon-witchelny-cost",
  "arena-ex13-flamewizardmon-optional-cost",
  "arena-ex5-attack-priority",
  "arena-ex5-biting-crush-delay",
  "arena-p108-training-delay-no-target",
  "arena-p108-training-delay-with-target",
  "arena-bt13-royal-purge-delay-rush",
  "arena-p206-digital-gate-breeding-color",
  "arena-ex13-merciful-mode-attack-order",
  "arena-ad1-gallantmon-deletion-attack-order",
  "arena-bt20-cool-boy-stacked-omekamon",
  "arena-ex10-god-grade-raising-color",
  "arena-ex10-malomyotismon-trash-main",
  "arena-ex10-blastmon-digixros",
  "arena-issue-4888-app-fusion",
  "arena-issue-4889-weregarurumon-dna",
  "arena-paildramon-dna-inheritance",
  "arena-bt24-silphymon-dna",
  "arena-issue-4890-reina-deletion",
  "arena-issue-4891-seiten-on-play",
  "arena-issue-4892-effect-digixros",
  "arena-moon-pending-source-deleted",
  "arena-mirage-hidden-hand",
  "arena-kotone-digixros-pending-attack",
  "arena-bt6-beelstarmon-duplicate-cost",
  "arena-bt20-saviorhuckmon-end-turn-sistermon",
  "arena-bt25-beelstarmon-option-trash-trigger",
  "arena-bt20-last-guardian-omnimon-wipe",
  "arena-ex7-deputymon-option-trash-trigger",
  "arena-bt22-leopardmon-king-drasil",
  "arena-bt13-king-drasil-source-count",
  "arena-bt13-omnimon-later-token-rush",
  "arena-st12-blanc-rush-second-attack",
  "arena-bt26-zombie-plutomon-removed-trigger",
  "arena-bt24-hyogamon-pending-trash-digivolve",
  "arena-ex10-darkness-bagramon-digixros-interrupt",
  "arena-ex10-tactimon-digixros-material",
  "arena-hellscythe-onplay-priority",
  "arena-vikemon-live-source-lock",
  "arena-rizegreymon-derived-priority",
  "arena-trident-derived-priority",
  "arena-flashy-attack-priority",
  "arena-dominimon-security-priority",
  "arena-piedmon-declined-opt",
  "arena-issue-4893-seiten-evo-cost",
  "arena-issue-4894-jesmon-token-limit",
  "arena-jesmon-scramble-dp-blocked",
  "arena-jesmon-scramble-dp-allowed",
  "arena-ex11-ryutaro-suspended",
  "arena-junomon-opponent-target",
  "arena-jupitermon-siren",
  "arena-security-effect-pacing",
  "arena-magnamon-x",
  "arena-mervamon-effect-assembly",
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
  "counter-blast-dna",
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

/** Monimon's By cost can be refused before sources move (Discord 1556016563600101406). */
function layBt26MonimonOptionalCostScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT26-006", "BT10-073", "P-115", "EX10-031"], "-monimon-attacker"));
    insertCard(human, Zone.Hand, faceDownCard("dev-monimon-yuu", "BT10-093", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-monimon-chuuchuumon", "BT14-057", 0));
  }
  const opponent = state.players[1];
  if (opponent !== undefined) {
    for (const slot of ["first", "second", "third"]) {
      const target = establishedDigimon(1, ["BT1-009"], `-monimon-target-${slot}`);
      target.isSuspended = true;
      placePermanent(opponent, target);
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/** Repeated support cards and saved sources, controlled through real engine intents. */
function layFieldGroupingScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (!player) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
    // Interleaved play order exercises grouping without changing the server array.
    const pieces =
      seat === 0
        ? [
            ["BT1-088"],
            ["P-035"],
            ["BT1-067", "BT1-074", "BT1-077"],
            ["BT12-098"],
            ["P-038"],
            ["BT1-088"],
            ["ST1-07"],
            ["P-035"],
            ["BT12-008", "BT12-098"],
            ["BT1-088"],
            ["P-038"],
            ["BT1-067"],
            ["BT12-098"],
            ["BT1-089"],
          ]
        : [["BT1-088"], ["ST2-06"], ["P-035"], ["BT1-088"], ["BT1-074", "BT1-077"], ["P-035"], ["BT1-088"]];
    pieces.forEach((stack, index) => {
      const permanent = establishedDigimon(seat, stack, `-grouping-${index}`);
      permanent.placedByEffect = getCardDefinition(permanent.topCard.cardId)?.kinds.includes(CardKind.Option) ?? false;
      // The bot keeps its suspended copies while the human takes the first turn.
      permanent.isSuspended = seat === 1 && index === 3;
      placePermanent(player, permanent);
    });
    const hand = seat === 0 ? ["BT1-088", "P-035", "BT1-074", "BT1-077"] : ["ST2-06", "ST2-06"];
    hand.forEach((id, index) =>
      insertCard(player, Zone.Hand, faceDownCard(`grouping-hand-${seat}-${index}`, id, seat)),
    );
    // First draw and subsequent Izzy reveals are deterministic Digimon.
    for (let index = 0; index < 5; index++) {
      insertCard(player, Zone.Deck, faceDownCard(`grouping-draw-${seat}-${index}`, "BT1-010", seat), "top");
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 8;
}

/** Late-game density with a conserved 50-card main deck on each side. */
function layDenseFieldGroupingScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  const deepSources = ["BT1-010", "ST1-07", "BT1-074", "BT1-077"].flatMap((id) => Array<string>(3).fill(id));
  const savedSources = ["BT12-008", "BT12-077"].flatMap((id) => Array<string>(4).fill(id));
  const stacks = [
    [...deepSources, "BT25-075"],
    [...savedSources, "BT12-098"],
    ...Array.from({ length: 3 }, () => ["BT1-088"]),
    ...["P-035", "P-038"].flatMap((id) => [[id], [id]]),
    ["BT12-098"],
    ["BT1-089"],
    ...Array.from({ length: 4 }, () => ["BT1-067"]),
    ...Array.from({ length: 4 }, () => ["BT1-009"]),
    ["BT1-011"],
    ["BT1-011"],
  ];
  const links = ["BT25-101", "BT25-100"];
  // The viewer also fields a green Lv.5, which takes a card from their draw pile.
  const viewerStacks = [...stacks, ["BT1-079"]];
  // Field 43 (44 for the viewer) + security 2 + hand 1 + draw pile 4 (3) = 50. No synthetic extra cards.
  const remainder = ["BT1-014", "BT1-014", "P-035", "BT1-015", "BT1-015", "BT1-016", "BT1-016"];
  const viewerRemainder = remainder.slice(0, -1);
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (!player) continue;
    const seatStacks = seat === 0 ? viewerStacks : stacks;
    const seatRemainder = seat === 0 ? viewerRemainder : remainder;
    loadDeckInto(player, seat, {
      mainDeck: [...seatStacks.flat(), ...links, ...seatRemainder],
      eggDeck: decks[seat].eggDeck,
    });
    const take = (id: string) => {
      const card = extractCardAt(
        player,
        Zone.Deck,
        player.deck.findIndex((candidate) => candidate.cardId === id),
      );
      if (!card) throw new Error(`Dense arena fixture is missing ${id}`);
      card.faceUp = true;
      return card;
    };
    seatStacks.forEach((stack, index) => {
      const permanent = new Permanent();
      permanent.permanentId = `dense-${seat}-${index}`;
      permanent.controllerSeat = seat;
      const topId = stack.at(-1)!;
      setTopCard(permanent, take(topId));
      for (const id of stack.slice(0, -1)) pushOnStack(permanent, take(id));
      permanent.baseDP = getCardDefinition(topId)?.dp ?? 0;
      permanent.currentDP = permanent.baseDP;
      permanent.enterFieldTurnCount = ESTABLISHED_TURN;
      permanent.isSuspended = seat === 1 && index % 3 === 0;
      permanent.placedByEffect = getCardDefinition(topId)?.kinds.includes(CardKind.Option) ?? false;
      if (index === 0) for (const id of links) linkEstablishedCard(permanent, take(id));
      placePermanent(player, permanent);
    });
    for (let index = 0; index < 2; index++) insertCard(player, Zone.Security, takeTop(player, Zone.Deck)!);
    insertCard(player, Zone.Hand, takeTop(player, Zone.Deck)!);
  }
  state.turnSeat = 0;
  state.turnCount = 18;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 8;
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

/** Marcus becomes a Digimon through his printed start-of-main effect, then pays Alliance. */
function layMarcusAllianceScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    // Low-DP security without Security effects keeps both Alliance checks deterministic.
    // The opening draw also cannot offer Marcus an incidental Greymon digivolution.
    loadDeckInto(player, seat, { mainDeck: Array(40).fill("BT1-009"), eggDeck: decks[seat].eggDeck });
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT23-020"], "-marcus-alliance-attacker"));
    placePermanent(human, establishedDigimon(0, ["BT12-092"], "-marcus-alliance-tamer"));
    placePermanent(human, establishedDigimon(0, ["BT12-034"], "-marcus-alliance-agumon"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/** Bakemon evolves and plays a Violet that did not exist when the evolution occurred. */
function layBt20BakemonVioletRetroactiveScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT20-063"], "-violet-ghostmon"));
    insertCard(human, Zone.Hand, faceDownCard("dev-violet-bakemon", "BT20-068", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-violet-new-tamer", "BT23-087", 0));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/** EX11 Necromon's On Play and When Digivolving each play Bakemon into an empty level-4 target pool. */
function layBt23BakemonNoTargetScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-bakemon-necromon-play", "EX11-051", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-bakemon-necromon-digivolve", "EX11-051", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-bakemon-revive-first", "BT23-064", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-bakemon-revive-second", "BT23-064", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-bakemon-ghost-decoy", "BT23-061", 0));
    placePermanent(human, establishedDigimon(0, ["BT2-075"], "-bakemon-necromon-base"));
    placePermanent(human, establishedDigimon(0, ["BT1-009"], "-bakemon-fodder-first"));
    placePermanent(human, establishedDigimon(0, ["BT1-009"], "-bakemon-fodder-second"));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-014"], "-bakemon-necromon-target-first"));
    placePermanent(bot, establishedDigimon(1, ["BT1-024"], "-bakemon-too-high-first"));
    placePermanent(bot, establishedDigimon(1, ["BT1-024"], "-bakemon-too-high-second"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 15;
}

/** Both public routes to Seventh Fascination's Main must wait for the recipient's turn end. */
/** Discord 1555938104404348949: real evolution immunity followed by Eclipse Impact. */
function layDiarbbitmonDualOptionImmunityScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat]!;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0]!;
  const base = establishedDigimon(0, ["EX12-051"], "-diarbbitmon");
  base.isSuspended = true;
  placePermanent(human, base);
  insertCard(human, Zone.Hand, faceDownCard("dev-diarbbitmon-evolution", "EX12-052", 0));
  const bot = state.players[1]!;
  placePermanent(bot, establishedDigimon(1, ["ST23-13"], "-eclipse-tamer"));
  // Passing supplies 3 memory; both Tamers then gain 1 at Main start, so the
  // evaluation policy can spend 5 on Eclipse Impact without handing over memory.
  placePermanent(bot, establishedDigimon(1, ["ST23-13"], "-eclipse-memory-tamer"));
  for (const slot of ["-eclipse-battle", "-eclipse-vortex"]) {
    const victim = establishedDigimon(1, ["BT26-061"], slot);
    victim.isSuspended = true;
    placePermanent(bot, victim);
  }
  while (bot.security.length > 0) extractCardAt(bot, Zone.Security, 0);
  for (let index = 0; index < 5; index++) {
    insertCard(bot, Zone.Security, faceDownCard(`dev-eclipse-security-${index}`, "BT1-001", 1));
  }
  insertCard(bot, Zone.Hand, faceDownCard("dev-eclipse-impact", "ST23-09", 1));
  // Keep the opponent's next draw from introducing another action into this repro.
  insertCard(bot, Zone.Deck, faceDownCard("dev-eclipse-draw", "BT1-001", 1), "top");
  state.turnSeat = 0;
  state.turnCount = 2;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
}

function layEx7SeventhFascinationTurnScenario(
  state: GameState,
  decks: readonly [Decklist, Decklist],
  fromTrash = false,
): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    if (fromTrash) {
      placePermanent(human, establishedDigimon(0, ["BT11-083"], "-seventh-purple"));
      insertCard(human, Zone.Hand, faceDownCard("dev-seventh-lilithmon-x", "EX7-061", 0));
      insertCard(human, Zone.Trash, faceUpCard("dev-seventh-option-trash", "EX7-072", 0));
    } else {
      placePermanent(human, establishedDigimon(0, ["EX7-061"], "-seventh-purple"));
      insertCard(human, Zone.Hand, faceDownCard("dev-seventh-option", "EX7-072", 0));
    }
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-seventh-target"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = fromTrash ? 10 : 7;
}

/** Discord 1556119607822254110: Mervamon offers Xros Heart materials from trash. */
function layMervamonTrashDigiXrosScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-trash-xros-played", "BT11-086", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-trash-xros-mervamon", "BT11-086", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-trash-xros-ignitemon", "BT11-076", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-trash-xros-invalid", "BT1-010", 0));
    insertCard(human, Zone.Deck, faceDownCard("dev-trash-xros-draw", "BT1-010", 0), "top");
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
}

/** Discord 1556119607822254110: Taiki unlocks materials under multiple Tamers. */
function layTaikiAnyTamerDigiXrosScenario(
  state: GameState,
  decks: readonly [Decklist, Decklist],
  effectPlay = false,
): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    const kotone = establishedDigimon(0, ["P-224"], "-any-tamer-kotone");
    setTopCard(kotone, faceUpCard("dev-any-tamer-kotone", "P-224", 0));
    const taiki = establishedDigimon(0, ["BT10-087"], "-any-tamer-taiki");
    setTopCard(taiki, faceUpCard("dev-any-tamer-taiki", "BT10-087", 0));
    const kotoneMaterials = effectPlay ? ["BT21-021"] : ["BT19-051", "BT19-038"];
    const taikiMaterials = effectPlay ? ["AD1-013"] : ["BT19-035", "BT19-061", "BT21-021"];
    kotoneMaterials.forEach((cardId, index) =>
      pushOnStack(kotone, faceUpCard(`dev-any-tamer-kotone-material-${index}`, cardId, 0)),
    );
    taikiMaterials.forEach((cardId, index) =>
      pushOnStack(taiki, faceUpCard(`dev-any-tamer-taiki-material-${index}`, cardId, 0)),
    );
    if (effectPlay) pushOnStack(taiki, faceUpCard("dev-any-tamer-played", "BT19-014", 0));
    else insertCard(human, Zone.Hand, faceDownCard("dev-any-tamer-played", "AD1-006", 0));
    placePermanent(human, kotone);
    placePermanent(human, taiki);
    // A neutral turn draw keeps Kotone's start-of-main placement from consuming materials.
    insertCard(human, Zone.Deck, faceDownCard("dev-any-tamer-draw", "BT1-010", 0), "top");
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
}

/** Discord 1555932180322975924, match 802ba658: Kotone to hand, lone X7 under Taiki. */
function layBt10TaikiX7XrosHeartScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-x7-taiki", "BT10-087", 0));
    // Turn draw, then the exact four-card reveal from 13:11:53 UTC.
    const top = ["BT1-009", "BT21-083", "P-224", "AD1-006", "BT8-097"];
    for (let index = top.length - 1; index >= 0; index -= 1) {
      insertCard(human, Zone.Deck, faceDownCard(`dev-x7-deck-${index}`, top[index]!, 0), "top");
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/** Discord 1555932429007593605: real attacks must play checked Adventure Tamers. */
function layAd1AdventureTamersSecurityScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
  }
  const human = state.players[0];
  if (human !== undefined) {
    setSecurityStack(human);
    // Shoutmon checked AD1-019 in match 802ba658; two established copies allow both checks.
    for (const suffix of ["-first", "-second"]) {
      placePermanent(human, establishedDigimon(0, ["BT19-008"], `-ad1-security${suffix}`));
    }
  }
  const opponent = state.players[1];
  if (opponent !== undefined) {
    for (const cardId of ["AD1-019", "AD1-022"]) {
      insertCard(opponent, Zone.Security, faceDownCard(`dev-security-${cardId}`, cardId, 1));
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/** Discord 1555848735278239744: LM-067 reveals P-180, which must cost no memory. */
function layLm067GundramonFreeOptionScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT10-064"], "-gundramon-base"));
    insertCard(human, Zone.Hand, faceDownCard("dev-gundramon", "LM-067", 0));
    // Main-entry draw, digivolution draw, then an unambiguous six-card reveal.
    const top = ["BT1-065", "BT1-065", "P-180", "BT1-027", "BT1-028", "BT1-045", "BT1-047", "BT1-050"];
    for (let index = top.length - 1; index >= 0; index -= 1) {
      insertCard(human, Zone.Deck, faceDownCard(`dev-gundramon-deck-${index}`, top[index]!, 0), "top");
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/** Match c3ab8a19: Dan & Kanan uses Sonic Shot, then the player declines its Link recipient. */
function layBt24SonicShotDeclineLinkScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT24-085"], "-sonic-shot-tamer"));
    placePermanent(human, establishedDigimon(0, ["BT24-009"], "-sonic-shot-host-1"));
    placePermanent(human, establishedDigimon(0, ["BT24-009"], "-sonic-shot-host-2"));
    insertCard(human, Zone.Hand, faceDownCard("dev-sonic-shot-option", "BT24-095", 0));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * Discord 1555516815226970172: both seats control EX13-071 Richard Sampson with a face-down card
 * under it, and the human's Sampson adds the deck's top card at the start of the Main phase. The
 * owner may look at the face-down cards under their own Tamer (§4-7-10); the bot's stay hidden.
 */
function layEx13SampsonFaceDownSourcesScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
    const sampson = establishedDigimon(seat, ["EX13-071"], "-sampson");
    pushOnStack(sampson, faceDownCard(`dev-sampson-source-${seat}`, "EX13-026", seat));
    placePermanent(player, sampson);
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/** Same physical Ravemon evolves again before its earlier deletion chain has finished. */
function layBt26RavemonRecycledTriggerScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
    // Keep Falcomon's reveal and the two digivolution draws unambiguous.
    for (let n = 0; n < 6; n += 1) {
      insertCard(player, Zone.Deck, faceDownCard(`dev-recycled-neutral-${seat}-${n}`, "BT1-009", seat), "top");
    }
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT26-005", "BT2-075"], "-recycled-first-base"));
    placePermanent(human, establishedDigimon(0, ["BT26-076"], "-recycled-crowmon"));
    const tamer = establishedDigimon(0, ["BT1-089"], "-recycled-tamer");
    pushOnStack(tamer, faceDownCard("dev-recycled-tamer-source", "BT1-010", 0));
    placePermanent(human, tamer);
    insertCard(human, Zone.Hand, faceDownCard("dev-recycled-ravemon", "BT26-082", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-recycled-falcomon", "BT26-065", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) insertCard(bot, Zone.Hand, faceDownCard("dev-recycled-opponent-discard", "BT1-009", 1));
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 8;
}

/**
 * Discord 1555674174369042583: Thomas H. Norstein's cost reduction trashes the card under Yoshino
 * Fujieda while Peckmon digivolves into Crowmon. Crowmon's own Tamer-stack cost then wakes its
 * reaction into the trash Ravemon, which deletes itself to delete the bot's highest-DP Digimon.
 */
function layBt26RavemonNestedOnDeletionScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT26-072"], "-ravemon-declared-peckmon"));
    placePermanent(human, establishedDigimon(0, ["BT26-072"], "-ravemon-other-peckmon"));
    const yoshino = establishedDigimon(0, ["BT26-091"], "-ravemon-yoshino");
    pushOnStack(yoshino, faceDownCard("dev-ravemon-yoshino-source", "ST24-10", 0));
    placePermanent(human, yoshino);
    const thomas = establishedDigimon(0, ["BT25-087"], "-ravemon-thomas");
    pushOnStack(thomas, faceDownCard("dev-ravemon-thomas-source-1", "BT26-049", 0));
    pushOnStack(thomas, faceDownCard("dev-ravemon-thomas-source-2", "ST24-02", 0));
    placePermanent(human, thomas);
    insertCard(human, Zone.Hand, faceDownCard("dev-ravemon-crowmon", "BT26-076", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-ravemon-trash", "BT26-082", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-ravemon-level-3"));
    placePermanent(bot, establishedDigimon(1, ["BT1-084"], "-ravemon-highest-dp"));
    for (let n = 0; n < 4; n += 1) {
      const card = takeTop(bot, Zone.Deck);
      if (card !== undefined) insertCard(bot, Zone.Hand, card);
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 6;
}

/**
 * Discord 1555741214014447737: three Yoshino Fujieda watch the same events. Lilamon suspends 1 of
 * the bot's Digimon and trashes 2 cards from under the first Yoshino in one payment, then
 * Rosemon suspends 2 more at once. Each event triggers each Yoshino once, and the order prompt's
 * "resolve after these" list must leave the offered effects and the resolve button in view.
 */
function layBt26YoshinoTriggerStackScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["ST24-05"], "-yoshino-stack-geogreymon"));
    const paying = establishedDigimon(0, ["BT26-091"], "-yoshino-stack-paying");
    pushOnStack(paying, faceDownCard("dev-yoshino-stack-source-1", "ST24-12", 0));
    pushOnStack(paying, faceDownCard("dev-yoshino-stack-source-2", "ST24-04", 0));
    placePermanent(human, paying);
    placePermanent(human, establishedDigimon(0, ["BT26-091"], "-yoshino-stack-second"));
    placePermanent(human, establishedDigimon(0, ["BT26-091"], "-yoshino-stack-third"));
    insertCard(human, Zone.Hand, faceDownCard("dev-yoshino-stack-lilamon", "ST24-10", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-yoshino-stack-rosemon", "ST24-11", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-yoshino-stack-first"));
    placePermanent(bot, establishedDigimon(1, ["BT1-010"], "-yoshino-stack-second"));
    placePermanent(bot, establishedDigimon(1, ["BT1-011"], "-yoshino-stack-third"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 6;
}

/**
 * Discord 1555741214014447737, rebuilt from production match b3759aa7 at 00:36:55 UTC: the
 * reporter's main phase with 4 memory, Agumon on Pinamon, and three Yoshino Fujieda carrying the
 * face-down cards the log shows. GeoGreymon, Lilamon and Ravemon in hand repeat the combo that
 * stacked every Yoshino under "Resolve after these" behind Ravemon's [On Deletion] order prompt.
 * Peckmon waits in the trash for Pinamon, and the Crowmon in hand is what a Yoshino digivolves
 * into once its turn comes. Boards hold card ids only; no player, room or match data.
 */
function layBt26YoshinoMatchScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    while (takeTop(human, Zone.Deck) !== undefined);
    [
      "ST24-12",
      "BT16-082",
      "BT26-072",
      "BT26-065",
      "BT13-060",
      "ST24-15",
      "BT26-036",
      "BT26-082",
      "ST24-04",
      "ST24-12",
      "BT26-049",
    ].forEach((cardId, index) => insertCard(human, Zone.Deck, faceDownCard(`dev-ym-deck-${index}`, cardId, 0)));
    while (human.security.length > 1) takeBottom(human, Zone.Security);
    placePermanent(human, establishedDigimon(0, ["BT26-005", "ST24-04"], "-ym-agumon"));
    const yoshinoSources: Record<string, readonly string[]> = {
      paying: ["ST24-14", "BT26-082"],
      second: ["ST24-14", "ST24-04", "BT26-049"],
      third: ["BT26-091", "BT26-076"],
    };
    for (const [slot, sources] of Object.entries(yoshinoSources)) {
      const yoshino = establishedDigimon(0, ["BT26-091"], `-ym-yoshino-${slot}`);
      sources.forEach((cardId, index) =>
        pushOnStack(yoshino, faceDownCard(`dev-ym-yoshino-${slot}-source-${index}`, cardId, 0)),
      );
      placePermanent(human, yoshino);
    }
    placePermanent(human, establishedDigimon(0, ["BT26-082"], "-ym-ravemon"));
    [
      ["geogreymon", "ST24-05"],
      ["lilamon", "ST24-10"],
      ["ravemon", "BT26-082"],
      ["crowmon", "BT26-076"],
      ["crowmon-2", "BT26-076"],
      ["lalamon", "BT26-036"],
      ["keenan", "BT26-094"],
      ["keenan-2", "BT26-094"],
      ["ukkomon", "BT16-082"],
    ].forEach(([name, cardId]) => insertCard(human, Zone.Hand, faceDownCard(`dev-ym-${name}`, cardId!, 0)));
    [
      "BT26-072",
      "ST24-05",
      "ST24-05",
      "ST24-12",
      "BT26-036",
      "BT26-050",
      "BT26-050",
      "ST24-04",
      "BT26-094",
      "BT26-065",
      "BT26-005",
      "ST24-10",
    ].forEach((cardId, index) => insertCard(human, Zone.Trash, faceUpCard(`dev-ym-trash-${index}`, cardId, 0)));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    while (bot.security.length > 2) takeBottom(bot, Zone.Security);
    placePermanent(bot, establishedDigimon(1, ["EX13-034", "BT18-030", "EX13-037"], "-ym-dynasmon"));
    placePermanent(bot, establishedDigimon(1, ["EX13-004", "BT18-030"], "-ym-candlemon"));
    const suspended = [
      establishedDigimon(1, ["EX13-004", "BT18-030", "EX10-041", "EX13-034"], "-ym-wisemon"),
      establishedDigimon(1, ["EX13-033"], "-ym-mistymon"),
      establishedDigimon(1, ["BT4-097"], "-ym-kari"),
      establishedDigimon(1, ["BT4-097"], "-ym-kari-2"),
    ];
    for (const permanent of suspended) {
      permanent.isSuspended = true;
      placePermanent(bot, permanent);
    }
    setBreeding(bot, establishedDigimon(1, ["EX13-004"], "-ym-breeding"));
    bot.breeding!.inBreeding = true;
    for (const cardId of ["EX13-029", "ST10-15", "ST10-14", "BT18-098", "EX13-029"])
      insertCard(bot, Zone.Hand, faceDownCard(`dev-ym-bot-hand-${bot.hand.length}`, cardId, 1));
    ["BT25-043", "BT18-030", "BT18-098", "BT3-096", "BT15-084", "BT15-092", "BT15-092"].forEach((cardId, index) =>
      insertCard(bot, Zone.Trash, faceUpCard(`dev-ym-bot-trash-${index}`, cardId, 1)),
    );
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 4;
}

/**
 * Discord 1555185598694821928: EX13-043 Leopardmon's "suspend 1 Digimon" has no unsuspended
 * gate, so the bot's already suspended Muchomon must be a legal target (Q1782).
 */
function layEx13LeopardmonSuspendedTargetScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-leopardmon-ex13", "EX13-043", 0));
    placePermanent(human, establishedDigimon(0, ["BT4-057"], "-leopardmon-ally"));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    const restingTarget = establishedDigimon(1, ["BT1-013"], "-leopardmon-resting");
    restingTarget.isSuspended = true;
    placePermanent(bot, restingTarget);
    placePermanent(bot, establishedDigimon(1, ["BT1-012"], "-leopardmon-lowest"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 12;
}

/**
 * Discord 1555307344550694942: EX13-043 Leopardmon's leave prevention costs "unsuspending 1 of
 * your Digimon". After EX13-040 Mikemon locks the bot's lone suspended Leopardmon, no Digimon can
 * pay, so Gryphonmon's attack deletes it.
 */
function layEx13LeopardmonUnsuspendLockScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-leopardmon-lock-mikemon", "EX13-040", 0));
    placePermanent(human, establishedDigimon(0, ["BT10-055"], "-leopardmon-lock-attacker"));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    const leopardmon = establishedDigimon(1, ["EX13-043"], "-leopardmon-lock-target");
    leopardmon.isSuspended = true;
    placePermanent(bot, leopardmon);
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 4;
}

/**
 * Discord 1555477213594259456: MetalTyrannomon checks the bot's BT13-106 Odin's Breath, whose
 * [Security] effect gives every human Digimon ＜Security Attack -1＞ for this turn (5 security
 * cards in total, so its "6 or fewer" condition holds). EX13-044 Breakdramon, with EX13-021
 * Wingdramon under it, then attacks with a check count of 0: no card is checked (Q644), and the
 * attack arrow must still go away when the attack ends.
 */
function layEx13BreakdramonZeroSecurityCheckScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
  }
  const human = state.players[0];
  if (human !== undefined) {
    setSecurityStack(human);
    takeBottom(human, Zone.Security);
    takeBottom(human, Zone.Security);
    placePermanent(human, establishedDigimon(0, ["BT1-024"], "-zero-check-opener"));
    placePermanent(human, establishedDigimon(0, ["EX13-008", "EX13-021", "EX13-044"], "-zero-check-breakdramon"));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    insertCard(bot, Zone.Security, faceDownCard("dev-zero-check-odins-breath", "BT13-106", 1));
    insertCard(bot, Zone.Security, faceDownCard("dev-zero-check-last-security", "BT1-009", 1));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * Discord 1555594986756767896: the bot's BT8-097 Crimson Blaze [Security] deletes every human
 * Digimon with 6000 DP or less at once. Three of them are Red or Black, so the Atho, René & Por
 * token's ＜Decoy (Red/Black)＞ must let the human choose which one survives.
 */
function layDecoyProtectChoiceScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
  }
  const human = state.players[0];
  if (human !== undefined) {
    setSecurityStack(human);
    placePermanent(human, establishedDigimon(0, ["BT1-080"], "-decoy-attacker"));
    placePermanent(human, establishedDigimon(0, ["EX13-047"], "-decoy-gotsumon"));
    placePermanent(human, establishedDigimon(0, ["BT1-009"], "-decoy-monodramon"));
    placePermanent(human, establishedDigimon(0, ["BT1-010"], "-decoy-agumon"));
    placePermanent(human, establishedDigimon(0, ["TOKEN-AthoRenePor-Token"], "-decoy-token"));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    insertCard(bot, Zone.Security, faceDownCard("dev-decoy-crimson-blaze", "BT8-097", 1));
    insertCard(bot, Zone.Security, faceDownCard("dev-decoy-last-security", "BT1-009", 1));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * Discord 1555485421750984765: the human's EX13-062 Craniamon has P-245 Kakkinmon in its
 * digivolution cards, and the turn draw brings the hand to 8. At the end of the turn,
 * Kakkinmon's inherited "By suspending 1 of your black Digimon with ＜Blocker＞, if your hand has
 * 7 or fewer cards, ＜Draw 1＞" can still suspend Craniamon without drawing, and that suspension
 * fires Craniamon's sweep of the bot's lowest-play-cost Digimon.
 */
function layP245KakkinmonFullHandSuspendScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    for (let index = 0; index < 7; index += 1) {
      insertCard(human, Zone.Hand, faceDownCard(`dev-kakkinmon-hand-${index}`, "BT1-009", 0));
    }
    placePermanent(human, establishedDigimon(0, ["P-245", "EX13-062"], "-kakkinmon-craniamon"));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-kakkinmon-cheapest"));
    placePermanent(bot, establishedDigimon(1, ["BT1-013"], "-kakkinmon-dearer"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/**
 * Discord 1555307552223264829: the human plays EX13-060 Alphamon from hand, which passes memory to
 * the bot, then its [End of Your Turn] plays EX13-057 Grademon with Rush, and its [Your Turn] lets
 * a Digimon attack. The bot's only Digimon is unsuspended, so the attack target
 * prompt offers just the security stack, while the human's hand must not still read as playable
 * from the closed Main phase. The bot holds 10 cards, as in the reported match.
 */
function layEx13AlphamonEndTurnAttackScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-alphamon-rush-alphamon", "EX13-060", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-alphamon-rush-grademon", "EX13-057", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT10-055"], "-alphamon-rush-blocker"));
    for (let index = 0; index < 10; index += 1) {
      const card = extractCardAt(bot, Zone.Deck, 0);
      if (card !== undefined) insertCard(bot, Zone.Hand, card);
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
}

/**
 * Discord 1555073882145423380: after accepting BT20-093's "you may play", the hand pick of two
 * legal Digimon still offers No Selection, and the Option is placed without playing either.
 */
function layBt20DragonGeneSkipPlayScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT1-009"], "-dragon-gene-red"));
    insertCard(human, Zone.Hand, faceDownCard("dev-dragon-gene-option", "BT20-093", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-dragon-gene-coredramon", "BT20-023", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-dragon-gene-examon", "EX3-074", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-dragon-gene-target"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
}

/**
 * Discord 1555363063300096090 (match 175caa69): after BT26-050's Option side resolves, the bot's
 * Hyogamon attacks, becomes suspended, and pays its hand-trash cost. Shamanmon's inherited
 * digivolve into SkullBaluchimon from the trash must stay locked until the bot's turn ends.
 */
function layBt26RosemonOptionDigivolveLockScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT25-021"], "-rosemon-data-squad"));
    insertCard(human, Zone.Hand, faceDownCard("dev-rosemon-option", "BT26-050", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-rosemon-lock-first"));
    placePermanent(bot, establishedDigimon(1, ["BT1-012"], "-rosemon-lock-second"));
    placePermanent(bot, establishedDigimon(1, ["BT24-009", "BT24-026"], "-rosemon-hyogamon"));
    insertCard(bot, Zone.Hand, faceDownCard("dev-rosemon-trash-cost", "BT1-083", 1));
    insertCard(bot, Zone.Trash, faceUpCard("dev-rosemon-skullbaluchimon", "BT24-075", 1));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 6;
}

/**
 * BT22-090 Rie Kishibe at 5 security: neither LordKnightmon in hand meets its digivolution
 * requirement (Q4959), but §15-7-5 still lets the end-of-turn "By deleting" cost be paid.
 */
function layBt22RieKishibeDeleteWithoutDigivolveScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT22-090"], "-rie-bt22"));
    placePermanent(human, establishedDigimon(0, ["EX13-074"], "-rie-ex13"));
    insertCard(human, Zone.Hand, faceDownCard("dev-rie-lordknightmon-x", "BT19-073", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-rie-lordknightmon-cs", "EX13-064", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-rie-target"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/** Discord 1555959036778643466: separate token effects each trigger Kurisarimon. */
function layBt2KurisarimonRepeatMemoryScenario(
  state: GameState,
  decks: readonly [Decklist, Decklist],
  startMain = false,
): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    const stack = ["BT2-005", "BT2-054", "BT2-059", "BT2-060"];
    if (startMain) stack.push("EX6-043");
    placePermanent(human, establishedDigimon(0, stack, "-kurisarimon-host"));
    if (startMain) {
      placePermanent(human, establishedDigimon(0, ["EX6-043"], "-kurisarimon-peer"));
    } else {
      placePermanent(human, establishedDigimon(0, ["BT5-090"], "-kurisarimon-arata"));
      insertCard(human, Zone.Hand, faceDownCard("dev-kurisarimon-diaboromon", "EX6-043", 0));
    }
    insertCard(human, Zone.Hand, faceDownCard("dev-kurisarimon-spare", "BT2-054", 0));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = startMain ? 3 : 1;
}

/** BT24-013 Fugamon draws only when that Fugamon itself is trashed from the hand. */
function layBt24FugamonSelfTrashScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT24-013"], "-fugamon-attacker"));
    insertCard(human, Zone.Hand, faceDownCard("dev-fugamon-fodder", "BT1-009", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-fugamon-in-hand", "BT24-013", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-fugamon-target"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * EX12-035 MetalGarurumon's When Digivolving against the Discord board: the bot's only
 * digivolution card sits under Cherubimon, so the trash has no choice and Salamon has none.
 */
function layEx12MetalGarurumonTrashThenReturnScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX12-032"], "-metalgarurumon-base"));
    insertCard(human, Zone.Hand, faceDownCard("dev-metalgarurumon-in-hand", "EX12-035", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT16-024", "EX6-035"], "-metalgarurumon-cherubimon"));
    placePermanent(bot, establishedDigimon(1, ["BT15-034"], "-metalgarurumon-salamon"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * BT22-044 Palmon's inherited restack names "this [CS] trait Digimon": it must not be offered
 * under EX13-077 Omnimon: Merciful Mode (no [CS]), only under BT22-031 GoldNumemon.
 */
function layBt22PalmonCsRestackScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT22-044", "EX13-077"], "-palmon-non-cs"));
    placePermanent(human, establishedDigimon(0, ["BT22-044", "BT22-031"], "-palmon-cs"));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-palmon-target"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * The bot plays BT14-032 Chuumon, so the viewer sees, from the opponent's side, the [Sukamon]
 * card it reveals before placing it on top of security.
 */
function layBt14ChuumonSecurityRevealScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    // The bot's evaluation ranks a Sukamon in hand above Chuumon, so Sukamon starts on top of
    // security instead: Chuumon adds it to the hand, then places it back. The draw is a second
    // Chuumon so no random deck card can outrank the play either.
    insertCard(bot, Zone.Hand, faceDownCard("dev-chuumon-play", "BT14-032", 1));
    insertCard(bot, Zone.Deck, faceDownCard("dev-chuumon-draw", "BT14-032", 1), "top");
    insertCard(bot, Zone.Security, faceDownCard("dev-chuumon-sukamon", "BT14-034", 1), "top");
    takeBottom(bot, Zone.Security);
  }
  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * Discord 1555074299344191549, match 052add84: on the opponent's turn a security removal plays
 * Omekamon from under King Drasil_7D6, and its [On Play] digivolves it into Omnimon (X Antibody)
 * as its controller's only Digimon. The bot attacks with WarGreymon; Paildramon has summoning
 * sickness so it stays home.
 */
function layBt20OmnimonEachPlayerSurvivorScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
  }
  const human = state.players[0];
  if (human !== undefined) {
    for (const index of [0, 1]) {
      insertCard(human, Zone.Security, faceDownCard(`dev-omnimon-security-${index}`, "BT1-010", 0));
    }
    const kingDrasil = establishedDigimon(0, ["BT20-083", "BT13-007"], "-king-drasil");
    kingDrasil.inBreeding = true;
    setBreeding(human, kingDrasil);
    insertCard(human, Zone.Hand, faceDownCard("dev-omnimon-x-antibody", "BT20-102", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    setSecurityStack(bot);
    placePermanent(bot, establishedDigimon(1, ["AD1-004"], "-omnimon-attacker"));
    const resting = establishedDigimon(1, ["AD1-011"], "-omnimon-resting");
    resting.enterFieldTurnCount = 1;
    placePermanent(bot, resting);
  }
  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/**
 * Discord 1555069212727185488: BT20-060's -15000 DP hits a Chronomon: Holy Mode that BT26-029
 * protected until the end of this turn. The startup installs that protection
 * (`startDevScenario`); the reduction must apply on the bot's turn.
 *
 * Two routes put Alphamon: Ouryuken in play. From the hand, King Drasil_7D6 (4 + 5 sources)
 * drops its play cost from 9 to 0 and its [On Play] resolves. From King Drasil's digivolution
 * cards, BT13-110's ＜Delay＞ plays it, and the printed rule keeps its [On Play] from activating.
 */
function layBt20OuryukenReductionResumesScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 3);
  const human = state.players[0];
  if (human !== undefined) {
    const drasil = establishedDigimon(0, ["BT20-060", ...Array<string>(5).fill("BT13-007")], "-ouryuken-king-drasil");
    drasil.inBreeding = true;
    setBreeding(human, drasil);
    const purge = establishedDigimon(0, ["BT13-110"], "-ouryuken-royal-purge");
    purge.placedByEffect = true;
    placePermanent(human, purge);
    insertCard(human, Zone.Hand, faceDownCard("dev-ouryuken", "BT20-060", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT26-029", "BT26-016"], "-ouryuken-chronomon"));
  }
}

/** BT22-089 Mirei Mikagura may play only a play cost 4 or higher Mirei or [CS] Tamer. */
function layBt22MireiPlayCostFloorScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT22-089"], "-mirei-source"));
    insertCard(human, Zone.Hand, faceDownCard("dev-mirei-cost-three", "BT22-089", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-mirei-ami-cost-four", "BT22-093", 0));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/** BT12-036 Mikemon's inherited memory gain reacts only to its own host's battle deletions. */
function layBt12MikemonOwnBattleOnlyScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT12-036", "BT12-038"], "-mikemon-host"));
    placePermanent(human, establishedDigimon(0, ["BT12-038"], "-mikemon-neighbor"));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    for (const slot of ["-mikemon-first-target", "-mikemon-second-target"]) {
      const target = establishedDigimon(1, ["BT1-009"], slot);
      target.isSuspended = true;
      placePermanent(bot, target);
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/** P-240 Arcturusmon plays by Assembly -6 and digivolves from a Red/Yellow Lv.5 [VB] Digimon. */
function layP240ArcturusmonVbRoutesScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX12-007", "EX12-013", "EX12-014"], "-arcturusmon-vb-base"));
    insertCard(human, Zone.Hand, faceDownCard("dev-arcturusmon-digivolve", "P-240", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-arcturusmon-assembly", "P-240", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-arcturusmon-material-5", "EX12-014", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-arcturusmon-material-4", "BT10-050", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-arcturusmon-material-3", "EX12-021", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009", "BT1-020"], "-arcturusmon-target"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 11;
}

/**
 * P-240 Arcturusmon places 2 different trash cards as its bottom digivolution cards, and the
 * player orders them (Discord 1555224478416633927, CR 3-1-3-4).
 */
function layP240ArcturusmonOrderedPlacementScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX12-007", "EX12-014"], "-arcturusmon-ordered-base"));
    insertCard(human, Zone.Hand, faceDownCard("dev-arcturusmon-ordered", "P-240", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-arcturusmon-ordered-gammamon", "EX12-007", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-arcturusmon-ordered-betelgammamon", "EX12-013", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009", "BT1-020"], "-arcturusmon-ordered-target"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/** EX12-077 Proximamon uses the DUAL EX12-018 Siriusmon it digivolved from as an Option. */
function layEx12ProximamonDualSiriusmonScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(
      human,
      establishedDigimon(0, ["EX12-007", "EX12-013", "EX12-014", "EX12-018"], "-proximamon-siriusmon"),
    );
    placePermanent(human, establishedDigimon(0, ["EX12-007", "EX12-013", "EX12-014"], "-proximamon-canoweissmon"));
    insertCard(human, Zone.Hand, faceDownCard("dev-proximamon", "EX12-077", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-020"], "-proximamon-highest"));
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-proximamon-lower"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/**
 * EX12-018 Siriusmon places a hand card and a trash card as one group: one top-or-bottom
 * choice, one order choice, and one placement (Discord 1555224478416633927).
 */
function layEx12SiriusmonGroupPlacementScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX12-007", "EX12-014"], "-siriusmon-base"));
    insertCard(human, Zone.Hand, faceDownCard("dev-siriusmon", "EX12-018", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-siriusmon-hand-material", "EX12-013", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-siriusmon-trash-material", "BT10-050", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["AD1-007"], "-siriusmon-target"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/**
 * EX12-001's end-of-turn DNA digivolves into WereGarurumon, which then attacks. Face-up
 * EX12-069 must join that attack's pending [When Digivolving] and [When Attacking] effects.
 */
function layEx12VirusBustersEffectAttackScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX12-001", "EX12-013"], "-virus-busters-nyaromon"));
    placePermanent(human, establishedDigimon(0, ["EX12-024"], "-virus-busters-partner"));
    insertCard(human, Zone.Hand, faceDownCard("dev-virus-busters-weregarurumon", "EX12-032", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-virus-busters-same-level", "EX12-016", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-virus-busters-after-digivolve", "EX12-017", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-virus-busters-metalgarurumon", "EX12-035", 0));
    insertCard(human, Zone.Security, faceUpCard("dev-virus-busters-security", "EX12-069", 0));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/** Bishop Device forbids EX3 Wingdramon from paying Evade's suspend cost. */
function layEx3WingdramonEvadeSuspendLockScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT1-009"], "-evade-red-source"));
    insertCard(human, Zone.Hand, faceDownCard("dev-evade-bishop", "P-161", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-evade-deletion", "BT11-097", 0));
  }
  const opponent = state.players[1];
  if (opponent !== undefined) {
    placePermanent(opponent, establishedDigimon(1, ["EX3-020"], "-evade-wingdramon"));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
}

/** EX13 Wingdramon removes sources and prevents EX3 Wingdramon from paying Evade. */
function layEx13WingdramonEvadeSuspendLockScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-evade-lock", "EX13-021", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-evade-deletion", "BT11-097", 0));
  }
  const opponent = state.players[1];
  if (opponent !== undefined) {
    placePermanent(opponent, establishedDigimon(1, ["BT1-009", "BT1-010", "EX3-020"], "-ex13-evade-target"));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
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

/**
 * Link Navimon onto DoGatchmon: its "when linked, it may attack" and Tamer Haru Shinkai's link watcher
 * trigger together. Resolve DoGatchmon first; Haru must resolve before the security check.
 */
function layBt21DogatchmonLinkAttackScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT21-018"], "-bt21-dogatchmon"));
    placePermanent(human, establishedDigimon(0, ["BT21-084"], "-bt21-link-tamer"));
    insertCard(human, Zone.Hand, faceDownCard("dev-bt21-link-card", "BT21-047", 0));
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
function layDracomonStartMainScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 3);
  const human = state.players[0]!;
  placePermanent(human, establishedDigimon(0, ["BT20-007"], "-dracomon"));
  const dracomonX = establishedDigimon(0, ["EX13-005", "BT20-007", "BT21-046"], "-dracomon-x");
  dracomonX.inBreeding = true;
  setBreeding(human, dracomonX);
  for (const [index, cardId] of ["EX13-041", "EX13-021", "BT20-044", "EX13-045"].entries()) {
    insertCard(human, Zone.Hand, faceDownCard(`dev-dracomon-hand-${index}`, cardId, 0));
  }
  // The normal turn draw recreates the original five-card hand. Dracomon's
  // subsequent effect draw supplies the missing destination for Dracomon X.
  insertCard(human, Zone.Deck, faceDownCard("dev-dracomon-evolution-draw", "BT1-010", 0), "top");
  insertCard(human, Zone.Deck, faceDownCard("dev-dracomon-effect-draw", "EX3-018", 0), "top");
  insertCard(human, Zone.Deck, faceDownCard("dev-dracomon-turn-draw", "EX13-008", 0), "top");
}

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

/**
 * Four [Security] effects in a row, for judging how a security check paces on screen. The
 * human attacks with three ready Digimon into a bot stack of, top first: ST1-16 (delete),
 * BT1-108 (suspend, then add itself to hand), BT10-087 (play itself) and ST2-13 (memory).
 */
function laySecurityEffectPacingScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
  }

  const human = state.players[0];
  if (human !== undefined) {
    setSecurityStack(human);
    for (const slot of ["-a", "-b", "-c"]) placePermanent(human, establishedDigimon(0, ["BT1-009"], `-pacing${slot}`));
  }

  const opponent = state.players[1];
  if (opponent !== undefined) {
    const securityCards = ["ST1-16", "BT1-108", "BT10-087", "ST2-13", "ST2-13"];
    securityCards.forEach((cardId, index) =>
      insertCard(opponent, Zone.Security, faceDownCard(`dev-pacing-security-${index}`, cardId, 1)),
    );
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
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

/** Discord 1555252641649393796: EX13-047 reveals promo Knightmon P-111, whose ＜Blocker＞ qualifies. */
function layEx13GotsumonPromoKnightmonScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-gotsumon-knightmon", "EX13-047", 0));
    // Insert in reverse because deck[0] is the top card. The neutral card absorbs the turn draw.
    insertCard(human, Zone.Deck, faceDownCard("dev-gotsumon-black-scramble", "LM-031", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-gotsumon-promo-knightmon", "P-111", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-gotsumon-tai-kamiya", "ST15-14", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-gotsumon-knightmon-turn-draw", "BT1-009", 0), "top");
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * Discord regression (match d64ba0e9): EX13-062 Craniamon's [Assembly -5] needs black Lv.5/Lv.4/Lv.3
 * cards with printed ＜Blocker＞. Memory 0 makes the full-cost play illegal, so only Assembly works.
 * EX13-050 (inherited-only Blocker) and BT1-031 (blue) are decoys the picker must not offer.
 */
function layEx13CraniamonAssemblyScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-craniamon", "EX13-062", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-craniamon-lv5", "BT20-054", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-craniamon-lv4", "EX1-047", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-craniamon-lv3", "BT13-061", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-craniamon-inherited-blocker", "EX13-050", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-craniamon-blue-blocker", "BT1-031", 0));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/**
 * Discord regression: P-220 Millenniummon prints [Assembly -6] with three [Composite]/[Ver.3]/[Ver.5]
 * Digimon of different levels. Memory 0 makes the full-cost play (14) illegal. EX9-034 repeats
 * Patamon's level and BT1-020 lacks the traits, so neither may complete the set.
 */
function layP220MillenniummonAssemblyScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-millenniummon", "P-220", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-millenniummon-lv3", "EX9-023", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-millenniummon-lv4", "BT18-013", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-millenniummon-lv5", "BT18-015", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-millenniummon-same-level", "EX9-034", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-millenniummon-no-trait", "BT1-020", 0));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/**
 * EX9-062 SkullGreymon is also treated as Lv.4 for EX9-074 Kimeramon's [Assembly -7]. The trash
 * holds six differently named Lv.4 [DM] Digimon, so the seventh material must be SkullGreymon.
 */
function layEx9KimeramonSkullGreymonAssemblyScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-kimeramon", "EX9-074", 0));
    for (const cardId of ["EX9-009", "EX9-010", "EX9-017", "EX9-025", "EX9-026", "EX9-028"]) {
      insertCard(human, Zone.Trash, faceUpCard(`dev-kimeramon-${cardId}`, cardId, 0));
    }
    insertCard(human, Zone.Trash, faceUpCard("dev-kimeramon-skullgreymon", "EX9-062", 0));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/**
 * BT24-062 MasterBlimpmon prints two alternative recipes: "[Blimpmon]/Tamer card w/[TS] trait".
 * Only the [TS] Tamer is in the trash; the [TS] Digimon decoy must not qualify.
 */
function layBt24MasterBlimpmonAssemblyScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-masterblimpmon", "BT24-062", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-masterblimpmon-ts-tamer", "BT24-083", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-masterblimpmon-ts-digimon", "BT24-009", 0));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/**
 * BT22-078 Boltmon needs five [Flame] Digimon with different card numbers. The trash holds a
 * second BT15-069, which may not join a set that already has one. Memory 0 rules out the
 * full-cost play (12).
 */
function layBt22BoltmonAssemblyScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-boltmon", "BT22-078", 0));
    for (const cardId of ["BT11-084", "BT15-009", "BT15-015", "BT15-069", "BT18-030"]) {
      insertCard(human, Zone.Trash, faceUpCard(`dev-boltmon-${cardId}`, cardId, 0));
    }
    insertCard(human, Zone.Trash, faceUpCard("dev-boltmon-repeated-number", "BT15-069", 0));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/** EX13-077 and EX12-076 print a rainbow Lv.6 digivolve cost: any-color Lv.6 bases qualify. */
function layRainbowEvoCostScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["AD1-004"], "-rainbow-wargreymon"));
    placePermanent(human, establishedDigimon(0, ["BT3-089"], "-rainbow-boltmon"));
    insertCard(human, Zone.Hand, faceDownCard("dev-rainbow-merciful-mode", "EX13-077", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-rainbow-susanoomon", "EX12-076", 0));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 12;
}

/**
 * BT10-061 Mighty Axe Mode is also named [SkullKnightmon] and [DeadlyAxemon] in every zone
 * (Q1988). Playing BT10-066 DarkKnightmon must offer it from hand for either DigiXros slot,
 * next to the real SkullKnightmon P-115 it was paired with in the reported match.
 */
function layMightyAxeModeDigiXrosScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-mightyaxe-darkknightmon", "BT10-066", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-mightyaxe-mode", "BT10-061", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-mightyaxe-skullknightmon", "P-115", 0));
    insertCard(human, Zone.Deck, faceDownCard("dev-mightyaxe-turn-draw", "BT1-009", 0), "top");
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * Match c75b43cf: a card drawn while the viewer is disconnected never reached their hand after
 * the reconnect, and SkullKnightmon's hand-trash cost then drew it as a card back. The viewer
 * ends the first turn, goes offline during the bot's turn, and draws Kotemon while offline.
 */
function layHandReconnectSyncScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-reconnect-skullknightmon", "EX10-026", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-reconnect-darkknightmon", "EX10-031", 0));
    insertCard(human, Zone.Deck, faceDownCard("dev-reconnect-offline-draw", "BT18-058", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-reconnect-turn-draw", "BT1-009", 0), "top");
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * EX13-031 KingSukamon rewrites the bot's green Sunflowmon into a white [Sukamon]. On the bot's
 * turn its green Blossomon must no longer digivolve onto it, because the rewrite replaces the
 * printed green (KB Q7294).
 */
function laySukamonTransformDigivolveScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-sukamon-transform-king", "EX13-031", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-sukamon-transform-fee", "BT3-061", 0));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    const sunflowmon = establishedDigimon(1, ["BT10-048"], "-sukamon-transform-sunflowmon");
    sunflowmon.permanentId = "sukamon-transform-sunflowmon";
    placePermanent(bot, sunflowmon);
    insertCard(bot, Zone.Hand, faceDownCard("dev-sukamon-transform-blossomon", "BT3-054", 1));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 7;
}

/**
 * The viewer-side mirror of `laySukamonTransformDigivolveScenario`: the bot opens with EX13-031
 * KingSukamon and a Chuumon to trash, so it rewrites the viewer's green Sunflowmon into a white
 * [Sukamon] until the viewer's turn ends. On that turn the viewer's green Blossomon must not be
 * offered or accepted as a digivolution (KB Q7294).
 */
function laySukamonTransformDigivolveViewerScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    const sunflowmon = establishedDigimon(0, ["BT10-048"], "-sukamon-viewer-sunflowmon");
    sunflowmon.permanentId = "sukamon-viewer-sunflowmon";
    placePermanent(human, sunflowmon);
    insertCard(human, Zone.Hand, faceDownCard("dev-sukamon-viewer-blossomon", "BT3-054", 0));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    insertCard(bot, Zone.Hand, faceDownCard("dev-sukamon-viewer-king", "EX13-031", 1));
    insertCard(bot, Zone.Hand, faceDownCard("dev-sukamon-viewer-fee", "BT3-061", 1));
  }

  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 8;
}

/** Discord 1555941341962309693, Nom match cbd3a09b-b0c9-497a-837a-90f25c7d7abb.
 * Stage the sequence before 13:40:18Z: Wizardmon -> X Antibody, recover an Option,
 * gain memory with Kari, play another Kari, then choose Wisemon's printed cost.
 */
function layEx13WisemonWitchelnyCostScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX13-004", "BT18-030", "BT18-036"], "-wisemon-base"));
    placePermanent(human, establishedDigimon(0, ["BT8-090"], "-wisemon-kari"));
    while (human.security.length > 0) takeTop(human, Zone.Security);
    ["BT20-102", "BT1-010", "BT1-011"].forEach((cardId, index) =>
      insertCard(human, Zone.Security, faceDownCard(`dev-wisemon-security-${index}`, cardId, 0)),
    );
    insertCard(human, Zone.Hand, faceDownCard("dev-wisemon-x", "BT19-036", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-wisemon-option", "BT18-098", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-wisemon-new-kari", "BT8-090", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-wisemon", "EX13-034", 0));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 8;
}

/**
 * EX13-032 Chirinmon pays "your top security card or the bottom face-down card from under
 * any of your Tamers". Both costs are payable here, so digivolving must ask once whether to
 * activate and then which cost to pay, each named by its cost.
 */
function layEx13ChirinmonCostChoiceScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT25-023"], "-chirinmon-base"));
    const tamer = establishedDigimon(0, ["BT13-098"], "-chirinmon-tamer");
    pushOnStack(tamer, faceDownCard("dev-chirinmon-tamer-under", "BT1-009", 0));
    placePermanent(human, tamer);
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-chirinmon", "EX13-032", 0));
  }
  const opponent = state.players[1];
  if (opponent !== undefined) placePermanent(opponent, establishedDigimon(1, ["BT20-031"], "-chirinmon-victim"));

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * EX13-029 FlameWizardmon's "By trashing your top security card" is optional (Discord
 * 1555472780571705354, KB Q7291). Declining on digivolve must keep the security stack and the
 * [Once Per Turn] use, so the same choice comes back when it attacks. Four plain security cards
 * make the "After" deletion fire once the cost is paid.
 */
function layEx13FlameWizardmonOptionalCostScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    while (human.security.length > 0) takeTop(human, Zone.Security);
    ["BT1-010", "BT1-011", "BT1-012", "BT1-013"].forEach((cardId, index) =>
      insertCard(human, Zone.Security, faceDownCard(`dev-flamewizardmon-security-${index}`, cardId, 0)),
    );
    placePermanent(human, establishedDigimon(0, ["BT18-030"], "-flamewizardmon-base"));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex13-flamewizardmon", "EX13-029", 0));
  }
  const opponent = state.players[1];
  if (opponent !== undefined) placePermanent(opponent, establishedDigimon(1, ["BT1-037"], "-flamewizardmon-victim"));

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * P-097 Zubamon places itself under a Digimon and reveals the top 3. The top/bottom
 * placement prompt has to show those three cards, so the player never chooses blind.
 */
function layP097ZubamonRevealOrderScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    // A Legend-Arms Digimon to place Zubamon under, which also arms the "gain 2 memory" clause.
    placePermanent(human, establishedDigimon(0, ["BT3-013"], "-p097-host"));
    insertCard(human, Zone.Hand, faceDownCard("dev-p097-zubamon", "P-097", 0));
    // Insert in reverse because deck[0] is the top card. The first card absorbs the turn draw,
    // so the three below it are the ones Zubamon reveals.
    insertCard(human, Zone.Deck, faceDownCard("dev-p097-reveal-3", "BT1-011", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-p097-reveal-2", "BT1-010", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-p097-reveal-1", "BT1-009", 0), "top");
    insertCard(human, Zone.Deck, faceDownCard("dev-p097-turn-draw", "BT1-019", 0), "top");
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * Turn-player priority on an effect-driven attack (KB Q1976/Q1993): seat 0 plays GrapLeomon
 * BT25-016, whose [On Play] orders Gaomon BT13-021 to attack. The declaration happens inside
 * GrapLeomon's own paused window, so Gaomon's [When Attacking] "each player draws 1" pools
 * there — it must still resolve BEFORE the bot's Analogman BT11-092 suspends to redirect the
 * attack onto its level 6 [Machine] Digimon. The seeded top deck card names the draw so the
 * log order is unambiguous.
 */
function layBt11AnalogmanRedirectTimingScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT13-021"], "-bt11-analogman-attacker"));
    insertCard(human, Zone.Hand, faceDownCard("dev-bt11-analogman-grapleomon", "BT25-016", 0));
    insertCard(human, Zone.Deck, faceDownCard("dev-bt11-analogman-when-attacking-draw", "BT1-009", 0), "top");
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT11-092"], "-bt11-analogman-tamer"));
    placePermanent(bot, establishedDigimon(1, ["BT15-066"], "-bt11-analogman-machine"));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 10;
}

/**
 * Discord bug 1552448454788124932: BT25-060 Rebootmon attacks, links BT25-052 Logimon for free,
 * unsuspends and gains "your opponent's Digimon effects don't affect it". Logimon's link effect
 * then suspends EX13-023 UlforceVeedramon, so the bot's BT11-112 Rina Shinomiya activates
 * Ulforce's [When Digivolving] return. That return is Ulforce's own Digimon effect, so Rebootmon
 * must stay while the non-immune BT1-013 goes to the bottom of the deck.
 */
function layBt11RinaUlforceImmunityScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT25-060"], "-rina-rebootmon"));
    placePermanent(human, establishedDigimon(0, ["BT1-013"], "-rina-exposed"));
    insertCard(human, Zone.Hand, faceDownCard("dev-rina-logimon", "BT25-052", 0));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT11-112"], "-rina-tamer"));
    placePermanent(bot, establishedDigimon(1, ["EX13-023"], "-rina-ulforce"));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/** Discord 1555995840093360188: start just after Noir's Arts deletion was Evaded. */
function layRinaEvadeUnsuspendScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    const veemon = establishedDigimon(0, ["BT11-023"], "-rina-evade-veemon");
    veemon.isSuspended = true;
    placePermanent(human, veemon);
    placePermanent(human, establishedDigimon(0, ["BT11-112"], "-rina-evade-bt11"));
    const rina = establishedDigimon(0, ["EX13-069"], "-rina-evade-ex13");
    rina.isSuspended = true;
    placePermanent(human, rina);
    fillZone(human, Zone.Hand, [faceDownCard("dev-rina-evade-veedramon", "EX13-019", 0)]);
    fillZone(
      human,
      Zone.Deck,
      Array.from({ length: 12 }, (_, index) => faceDownCard(`dev-rina-evade-draw-${index}`, "BT1-009", 0)),
    );
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT6-084", "EX13-066"], "-rina-evade-noir"));
    placePermanent(bot, establishedDigimon(1, ["ST12-12"], "-rina-evade-blanc"));
    placePermanent(bot, establishedDigimon(1, ["BT13-013"], "-rina-evade-savior"));
  }
  state.turnSeat = 0;
  state.turnCount = 6;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/** Discord bug 1555770458866065499: distinguish Ulforce's two borrowed digivolution effects. */
function layBt11RinaUlforceEffectChoiceScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT11-112"], "-rina-choice-tamer"));
    placePermanent(human, establishedDigimon(0, ["EX13-023"], "-rina-choice-ulforce"));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-013"], "-rina-choice-fewest"));
    placePermanent(bot, establishedDigimon(1, ["BT1-001", "BT1-011"], "-rina-choice-stacked"));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/**
 * Discord bug 1555168521175048263: the human uses EX12-052 Diarbbitmon's Option side, which
 * suspends the bot's EX13-023 UlforceVeedramon. The bot's BT11-112 Rina Shinomiya and the
 * inherited EX13-022 AeroVeedramon watcher must wait until the Option finishes, including the
 * Arts Digivolve onto P-093 Bastemon. The turn player's [When Digivolving] effects resolve first.
 */
function layEx12DiarbbitmonOptionTriggerTimingScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["P-093"], "-diarb-bastemon"));
    insertCard(human, Zone.Hand, faceDownCard("dev-diarb-option", "EX12-052", 0));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT11-112"], "-diarb-rina"));
    placePermanent(bot, establishedDigimon(1, ["EX13-022", "EX13-023"], "-diarb-ulforce"));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 6;
}

/**
 * KB Q4735: the human uses BT2-108 Night Raid to play BT2-067 DemiDevimon from the trash. The
 * bot's EX5-069 Biting Crush ＜Delay＞ plays EX5-063 Leviamon, whose derived [On Play] deletes
 * the human's Digimon, DemiDevimon included. BT15-081 Leviamon (X Antibody)'s pending trash
 * trigger never refers to the played Digimon, so it still digivolves Leviamon.
 */
function layBt15LeviamonXPlayedSubjectLeftScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT2-069"], "-leviamon-purple"));
    insertCard(human, Zone.Hand, faceDownCard("dev-leviamon-night-raid", "BT2-108", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-leviamon-demidevimon", "BT2-067", 0));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    const bitingCrush = establishedDigimon(1, ["EX5-069"], "-leviamon-biting-crush");
    bitingCrush.placedByEffect = true;
    placePermanent(bot, bitingCrush);
    insertCard(bot, Zone.Trash, faceUpCard("dev-leviamon-base", "EX5-063", 1));
    insertCard(bot, Zone.Trash, faceUpCard("dev-leviamon-x", "BT15-081", 1));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 4;
}

/**
 * BT17-069 Fenriloogamon's inherited [Your Turn] clause under BT20-081 Fenriloogamon:
 * Takemikazuchi: the turn ends only once the opponent reaches 3 memory (KB Q2831 — "your turn
 * will continue when your opponent's memory is at 1 or 2"). Two 2-cost plays walk the gauge from
 * +2 to -2 (opponent 2) without ending the turn; the 3-cost play then crosses to 3 and ends it.
 */
function layBt20TakemikazuchiTurnContinueScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    // Fenriloogamon is a digivolution card, so only its INHERITED clause is live — exactly the
    // placement the Blast DNA / DNA digivolve into Takemikazuchi leaves behind.
    // The reporter's stack shape: BT17-091's awaiting Aura is ordered ahead of BT17-069's
    // inherited SetTurnEndMemory in the continuous pass, which is what exposed the
    // clear-before-refill window the turn-end check used to read.
    placePermanent(
      human,
      establishedDigimon(0, ["BT17-091", "BT16-076", "BT17-069", "BT17-040", "BT20-081"], "-bt20-takemikazuchi"),
    );
    insertCard(human, Zone.Hand, faceDownCard("dev-takemikazuchi-play-1", "BT1-009", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-takemikazuchi-play-2", "BT1-009", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-takemikazuchi-play-3", "BT14-069", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-bt20-takemikazuchi-bot"));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 2;
}

/**
 * Comprehensive Rules 6-1-4-1 / official Q&A Q1770: moving the human's level 3 Digimon out of
 * breeding fires the bot's BT8-094 Digimon Emperor ([Opponent's Turn] gain 2 memory), which
 * pushes the gauge to the bot's side. The turn must end with the breeding phase — no main
 * phase, so the human's BT19-088 Ai & Mako ([Start of Your Main Phase] gain 1 memory) never
 * fires and cannot hand the turn back.
 */
function layBt8DigimonEmperorBreedingMemoryScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT19-088"], "-bt8-emperor-ai-mako"));
    const breeding = establishedDigimon(0, ["BT1-009"], "-bt8-emperor-mover");
    breeding.inBreeding = true;
    setBreeding(human, breeding);
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT8-094"], "-bt8-emperor-tamer"));
    // Ai & Mako's start-of-main gain is gated on the opponent having a Digimon, so the bug is
    // only visible (memory handed straight back) while the bot holds one.
    placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-bt8-emperor-bot-digimon"));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  // 1 memory, so the Emperor's +2 lands the bot on exactly the 1-memory turn-end threshold.
  state.memory = 1;
}

/**
 * ST24-15 DNA Charge sits in the battle area as a placed Option next to two [DATA SQUAD]
 * Tamers. Its [Start of Your Main Phase] clause must appear in the pending-effect picker
 * alongside the Tamers' own start-of-main effects, and paying it places DNA Charge face down
 * under the chosen Tamer for a draw and 1 memory (KB Q6232).
 *
 * Seat 1 starts as the turn player with nothing to do, so ending that turn opens the human's
 * Main phase and the picker straight away.
 */
function laySt24DnaChargeStartOfMainScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT26-094"], "-dna-charge-keenan"));
    placePermanent(human, establishedDigimon(0, ["ST24-14"], "-dna-charge-yoshino"));
    // A pure-Option permanent can only exist in the battle area because an effect put it there.
    const dnaCharge = establishedDigimon(0, ["ST24-15"], "-dna-charge-option");
    dnaCharge.placedByEffect = true;
    placePermanent(human, dnaCharge);
    // The [DATA SQUAD] card Keenan's own start-of-main clause places from hand, so its effect
    // and DNA Charge's both stay available and the picker has to offer a choice.
    insertCard(human, Zone.Hand, faceDownCard("dev-st24-data-squad", "ST24-02", 0));
  }

  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * BT20-055 Invisimon attacks into a face-up security card. Its [Your Turn] effect may place its
 * top card in security only when it has digivolution cards (BT17-098 Q2892, EX13-032 Q7307).
 */
function layBt20InvisimonSecurityScenario(
  state: GameState,
  decks: readonly [Decklist, Decklist],
  invisimonStack: readonly string[],
): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, invisimonStack, "-bt20-invisimon"));
  }
  const topSecurity = state.players[1]?.security[0];
  if (topSecurity !== undefined) topSecurity.faceUp = true;

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/** BT20-053 inherited effect: redirect the bot's player attack to the human's Digimon. */
function layBt20GrademonRedirectScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT20-053", "BT20-056"], "-bt20-grademon-host"));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["ST1-10"], "-bt20-grademon-attacker"));
  }

  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
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
/**
 * Discord 1554296143054118933: the bot attacks while EX13-036 Kentaurosmon is the viewer's only
 * Digimon. Its [Counter] must place itself and the attacker, each on top of its owner's security.
 */
function layEx13KentaurosmonEachPlayerSecurityScenario(
  state: GameState,
  decks: readonly [Decklist, Decklist],
  kentaurosmonCount: 1 | 2 = 1,
): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT3-038", "EX13-036"], "-ex13-kentaurosmon"));
    if (kentaurosmonCount === 2)
      placePermanent(human, establishedDigimon(0, ["BT3-038", "EX13-036"], "-ex13-kentaurosmon-second"));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["ST1-10"], "-ex13-kentaurosmon-attacker"));
  }

  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

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

/**
 * P-246 bug report: Motimon's inherited digivolve after a [Sukamon] dies attacking security.
 * The host stack is the reporter's (P-246, EX13-027, BT14-034, EX13-031, EX13-035). With
 * KingEtemon on top the Lv.6 host cannot become Lv.6 MetalEtemon; after the opponent's
 * De-Digivolve 1 left KingSukamon (Lv.5) on top, the same digivolve is legal.
 *
 * - `kingEtemonOnTop`: the human's turn, KingEtemon still on top.
 * - `afterDeDigivolve`: the human's turn, KingEtemon already in the trash.
 * - `botDeDigivolves`: the bot's turn first, holding BT25-025 Aegiochusmon: Blue and the
 *   memory to play it, so its ＜De-Digivolve 1＞ strips KingEtemon in front of the viewer.
 */
type P246MotimonStage = "kingEtemonOnTop" | "afterDeDigivolve" | "botDeDigivolves";

function layP246MotimonScenario(state: GameState, decks: readonly [Decklist, Decklist], stage: P246MotimonStage): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const kingEtemonDeDigivolved = stage === "afterDeDigivolve";
  const human = state.players[0];
  if (human !== undefined) {
    const hostStack = ["P-246", "EX13-027", "BT14-034", "EX13-031"];
    const host = establishedDigimon(
      0,
      kingEtemonDeDigivolved ? hostStack : [...hostStack, "EX13-035"],
      "-p246-motimon-host",
    );
    host.permanentId = "p246-motimon-host";
    placePermanent(human, host);
    const attacker = establishedDigimon(0, ["BT14-034"], "-p246-motimon-sukamon");
    attacker.permanentId = "p246-motimon-sukamon";
    placePermanent(human, attacker);
    insertCard(human, Zone.Hand, faceDownCard("dev-p246-metal-etemon", "EX5-054", 0));
    if (kingEtemonDeDigivolved) {
      insertCard(human, Zone.Trash, faceUpCard("dev-p246-de-digivolved-king-etemon", "EX13-035", 0));
    }
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    insertCard(bot, Zone.Security, faceDownCard("dev-p246-security-titamon", "BT1-080", 1), "top");
    takeBottom(bot, Zone.Security);
    if (stage === "botDeDigivolves") {
      insertCard(bot, Zone.Hand, faceDownCard("dev-p246-aegiochusmon-blue", "BT25-025", 1));
      // The turn draw is a Digi-Egg, which cannot be played from the hand, so Aegiochusmon is its only play.
      insertCard(bot, Zone.Deck, faceDownCard("dev-p246-bot-draw", "BT1-001", 1), "top");
    }
  }

  state.turnSeat = stage === "botDeDigivolves" ? 1 : 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = stage === "botDeDigivolves" ? 8 : 3;
}

/**
 * Discord 1555352172206493706: EX12-076 Susanoomon's "all of your opponent's Digimon" DP
 * reduction lasts for the turn, so the face-up BT26-082 Ravemon that plays itself from
 * security at the end of that turn arrives at 0 DP and is deleted.
 */
function layEx12SusanoomonLaterArrivalDpScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX12-015", "EX12-020", "EX12-019"], "-ex12-susanoomon-base"));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex12-susanoomon", "EX12-076", 0));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    insertCard(bot, Zone.Security, faceUpCard("dev-ex12-susanoomon-ravemon", "BT26-082", 1), "top");
    takeBottom(bot, Zone.Security);
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
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

/**
 * Discord 1555271931203158056: EX13-031 KingSukamon changes original DP, which is not a DP
 * reduction, so EX1-073 Machinedramon's "DP can't be reduced" must not keep it at 11000.
 */
function layEx13KingSukamonMachinedramonDpScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-kingsukamon-machinedramon-king", "EX13-031", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-kingsukamon-machinedramon-fee", "BT3-061", 0));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    const machinedramon = establishedDigimon(1, ["EX1-073"], "-kingsukamon-machinedramon");
    machinedramon.permanentId = "kingsukamon-machinedramon-target";
    placePermanent(bot, machinedramon);
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 7;
}

/**
 * Discord 1555375353977905269: once EX13-031 KingSukamon rewrites Vulcanusmon's name to
 * [Sukamon], BT25-101's "[Link] [Vulcanusmon]" requirement fails and the rule check trashes
 * it. BT25-100's "[Link] [TS] trait" card stays, because the rewrite keeps the traits.
 */
function layEx13KingSukamonVulcanusmonLinkScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    insertCard(human, Zone.Hand, faceDownCard("dev-kingsukamon-vulcanusmon-king", "EX13-031", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-kingsukamon-vulcanusmon-fee", "BT3-061", 0));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    const vulcanusmon = establishedDigimon(1, ["BT25-075"], "-kingsukamon-vulcanusmon");
    vulcanusmon.permanentId = "kingsukamon-vulcanusmon-target";
    linkEstablishedCard(vulcanusmon, faceUpCard("dev-kingsukamon-vulcanusmon-divine-arms", "BT25-101", 1));
    linkEstablishedCard(vulcanusmon, faceUpCard("dev-kingsukamon-vulcanusmon-iron-slash", "BT25-100", 1));
    placePermanent(bot, vulcanusmon);
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 7;
}

/**
 * Reproduces the BT16-015 Phoenixmon (X Antibody) report. "[Phoenixmon] or [X Antibody]" names
 * cards, so only the Phoenixmon X with the BT9-109 X Antibody Option underneath attaches
 * [End of Attack] to its [On Deletion] effects. The other one has only WarGrowlmon (X Antibody),
 * which has the X Antibody trait but not the name. Both carry Garudamon, whose inherited
 * [On Deletion] deletes an opposing 6000-DP-or-less Digimon, so the attach is visible.
 */
function layBt16PhoenixmonXAntibodyNameScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    const traitOnly = establishedDigimon(0, ["BT13-014", "BT9-014", "BT16-015"], "-bt16-phoenixmon-x-trait-only");
    traitOnly.permanentId = "phoenixmon-x-wargrowlmon-x-only";
    placePermanent(human, traitOnly);
    const namedOption = establishedDigimon(0, ["BT9-109", "BT13-014", "BT16-015"], "-bt16-phoenixmon-x-option");
    namedOption.permanentId = "phoenixmon-x-antibody-option";
    placePermanent(human, namedOption);
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    for (const suffix of ["first", "second", "third"] as const) {
      const target = establishedDigimon(1, ["BT1-009"], `-bt16-phoenixmon-x-${suffix}-target`);
      target.permanentId = `phoenixmon-x-${suffix}-target`;
      target.isSuspended = true;
      placePermanent(bot, target);
    }
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
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

/**
 * Discord bug 1555207697991864380: AD1-008 Gallantmon's [When Digivolving] deletes one
 * DarkTyrannomon and attacks. The inherited ST7-05 memory watcher and the [When Attacking]
 * deletion trigger together, so the player orders them (Q2044).
 */
function layAd1GallantmonDeletionAttackOrderScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["ST7-05", "BT12-016"], "-ad1-gallantmon-wargrowlmon"));
    insertCard(human, Zone.Hand, faceDownCard("dev-ad1-gallantmon-hand", "AD1-008", 0));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-019"], "-ad1-gallantmon-target-one"));
    placePermanent(bot, establishedDigimon(1, ["BT1-019"], "-ad1-gallantmon-target-two"));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 5;
}

/**
 * Discord bug 1555487329328693248: two BT20-091 Cool Boys watch one [Royal Knight] Craniamon.
 * The bot's Omnimon attacks; blocking with Craniamon deletes it on the bot's turn, so each
 * Cool Boy must play its own Omekamon from hand (Q5437, Q7374).
 */
function layBt20CoolBoyStackedOmekamonScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT13-077"], "-bt20-cool-boy-craniamon"));
    placePermanent(human, establishedDigimon(0, ["BT20-091"], "-bt20-cool-boy-first"));
    placePermanent(human, establishedDigimon(0, ["BT20-091"], "-bt20-cool-boy-second"));
    insertCard(human, Zone.Hand, faceDownCard("dev-bt20-cool-boy-omekamon-first", "BT20-083", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-bt20-cool-boy-omekamon-second", "BT20-083", 0));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT1-084"], "-bt20-cool-boy-attacker"));
  }

  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/** Neutral opening shared by the optional-effect regression scenarios. */
function prepareOptionalEffectPresetsScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    // Vanilla security keeps unrelated effects out of the confirmation regression.
    for (let index = 0; index < 5; index += 1) {
      insertCard(player, Zone.Security, faceDownCard(`dev-rika-security-${seat}-${index}`, "BT1-009", seat));
    }
    insertCard(player, Zone.Deck, faceDownCard(`dev-rika-draw-${seat}`, "BT1-010", seat), "top");
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/** Rika's watcher shares Sakuyamon's attack window, exercising preset context forwarding. */
function layRikaOptionalEffectPresetsScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareOptionalEffectPresetsScenario(state, decks);
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT23-034"], "-rika-sakuyamon"));
    placePermanent(human, establishedDigimon(0, ["EX2-060"], "-rika-tamer"));
    insertCard(human, Zone.Hand, faceDownCard("dev-rika-plugin", "EX2-066", 0));
  }
  const opponent = state.players[1];
  if (opponent !== undefined) {
    placePermanent(opponent, establishedDigimon(1, ["BT3-089"], "-rika-dp-target"));
  }
}

function layDavisOptionalEffectPresetsScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareOptionalEffectPresetsScenario(state, decks);
  state.memory = 10;
  const human = state.players[0];
  if (human === undefined) return;
  for (const slot of ["first", "second"]) {
    placePermanent(human, establishedDigimon(0, ["BT8-088"], `-preset-davis-${slot}`));
  }
  // Suspend by attacking before digivolving: the opening unsuspend phase resets seeded suspension.
  placePermanent(human, establishedDigimon(0, ["BT8-010"], "-preset-davis-base"));
  insertCard(human, Zone.Hand, faceDownCard("dev-preset-davis-evolving", "BT8-015", 0));
}

function layUkkomonOptionalEffectPresetsScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareOptionalEffectPresetsScenario(state, decks);
  const human = state.players[0];
  if (human === undefined) return;
  for (const slot of ["first", "second"]) {
    placePermanent(human, establishedDigimon(0, ["BT16-082"], `-preset-ukko-${slot}`));
  }
  const moved = establishedDigimon(0, ["BT1-009"], "-preset-ukko-moved");
  moved.inBreeding = true;
  setBreeding(human, moved);
  // Both mandatory reveals have neutral hits, regardless of the chosen catalog deck.
  for (let index = 0; index < 7; index += 1) {
    insertCard(human, Zone.Deck, faceDownCard(`dev-preset-ukko-reveal-${index}`, "BT1-010", 0), "top");
  }
  insertCard(human, Zone.EggDeck, faceDownCard("dev-preset-ukko-egg", "BT1-001", 0), "top");
}

function layDrasilOptionalEffectPresetsScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareOptionalEffectPresetsScenario(state, decks);
  state.memory = 10;
  const human = state.players[0];
  if (human === undefined) return;
  for (const slot of ["first", "second"]) {
    placePermanent(human, establishedDigimon(0, ["BT23-072"], `-preset-drasil-${slot}`));
  }
  insertCard(human, Zone.Hand, faceDownCard("dev-preset-drasil-played", "BT23-062", 0));
}

function layMattRepeatedEffectPresetsScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareOptionalEffectPresetsScenario(state, decks);
  state.memory = 10;
  const human = state.players[0];
  if (human === undefined) return;
  placePermanent(human, establishedDigimon(0, ["ST16-14"], "-preset-matt"));
  placePermanent(human, establishedDigimon(0, ["ST6-08"], "-preset-matt-base"));
  insertCard(human, Zone.Hand, faceDownCard("dev-preset-matt-lady", "BT3-088", 0));
  for (let index = 0; index < 2; index += 1) {
    insertCard(human, Zone.Hand, faceDownCard(`dev-preset-matt-discard-${index}`, "BT1-010", 0));
  }
}

/**
 * After the bot's turn, Gate of Deadly Sins deletes the human's four [On Deletion] Digimon at the
 * start of their main phase, so one prompt shows the resolution plan: two mandatory effects, two
 * "you may" effects.
 */
function layGateDeadlySinsEffectOrderScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    const gate = establishedDigimon(0, ["EX6-006"], "-gate-deadly-sins");
    gate.inBreeding = true;
    setBreeding(human, gate);
    for (const [slot, cardId] of [
      ["beelzemon", "BT12-085"],
      ["creepymon", "EX10-009"],
      ["ghoulmon", "BT25-076"],
      ["sukamon", "EX13-028"],
    ] as const) {
      placePermanent(human, establishedDigimon(0, [cardId], `-gate-order-${slot}`));
    }
    // Beelzemon (X Antibody) plays an [Impmon] from here; Gate places a Demon Lord from here
    // under itself, and this Lucemon lets it do so without taking a pending card.
    insertCard(human, Zone.Trash, faceUpCard("dev-gate-order-impmon", "BT2-068", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-gate-order-lucemon", "BT18-082", 0));
    // "top" inserts prepend: the draw phase takes the filler, then Sukamon reveals the rest.
    for (const [suffix, cardId] of [
      ["reveal-third", "BT1-014"],
      ["reveal-second", "BT1-009"],
      ["reveal-first-chuumon", "BT13-062"],
      ["draw", "BT1-010"],
    ] as const) {
      insertCard(human, Zone.Deck, faceDownCard(`dev-gate-order-${suffix}`, cardId, 0), "top");
    }
  }

  // The bot takes the opening turn. Its Digimon count as played that turn (turn 1), so they
  // cannot attack the board before Gate deletes it, and its draw is a known vanilla card.
  const bot = state.players[1];
  if (bot !== undefined) {
    for (const [slot, cardId] of [
      ["target-one", "BT1-009"],
      ["target-two", "BT1-010"],
    ] as const) {
      const target = establishedDigimon(1, [cardId], `-gate-order-${slot}`);
      target.enterFieldTurnCount = 1;
      placePermanent(bot, target);
    }
    insertCard(bot, Zone.Deck, faceDownCard("dev-gate-order-bot-draw", "BT1-010", 1), "top");
  }

  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
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

/**
 * Discord bug 1552451545319215174: EX10-011 MaloMyotismon's `[Trash] [Main]` must be offered
 * from the trash while BT16-072 Arukenimon and BT16-073 Mummymon are on the field, and play
 * for 3 at the production memory of 1 once both are deleted as its cost.
 */
function layEx10MaloMyotismonTrashMainScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT16-072"], "-malo-arukenimon"));
    placePermanent(human, establishedDigimon(0, ["BT16-073"], "-malo-mummymon"));
    insertCard(human, Zone.Trash, faceUpCard("dev-malo-trash-first", "EX10-011", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-malo-trash-second", "EX10-011", 0));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 1;
}

/**
 * Discord 1555207678542876682: EX10-034 Blastmon prints "[DigiXros -2] 3 Digimon cards w/[Bagra
 * Army] trait". A fourth [Bagra Army] card in hand shows the cap stops at three, not two.
 */
function layEx10BlastmonDigiXrosScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 7);
  const human = state.players[0];
  if (human === undefined) return;
  insertCard(human, Zone.Hand, faceDownCard("dev-blastmon", "EX10-034", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-blastmon-skullknightmon", "EX10-026", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-blastmon-deadlyaxemon", "EX10-027", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-blastmon-chuuchuumon", "EX10-039", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-blastmon-damemon", "EX10-044", 0));
  insertCard(human, Zone.Deck, faceDownCard("dev-blastmon-neutral-draw", "BT1-085", 0), "top");
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

function layPaildramonDnaInheritanceScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  const paildramonDeck = CATALOG_DECKS.find(({ deckId }) => deckId === "ad1-dgo-2026-04-12-1-imperialdramon");
  const humanDeck = paildramonDeck
    ? { mainDeck: [...paildramonDeck.decklist.mainDeck], eggDeck: [...paildramonDeck.decklist.eggDeck] }
    : decks[0];
  prepareIssueScenario(state, [humanDeck, decks[1]], 4);
  const human = state.players[0];
  if (human === undefined) return;
  placePermanent(human, establishedDigimon(0, ["BT12-002", "BT12-021", "BT21-037"], "-paildramon-dna-lighdramon"));
  insertCard(human, Zone.Hand, faceDownCard("dev-paildramon-dna-exveemon", "BT12-022", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-paildramon-dna-paildramon", "BT12-028", 0));
  const bot = state.players[1];
  if (bot === undefined) return;
  const displaced = takeBottom(bot, Zone.Security);
  if (displaced !== undefined) insertCard(bot, Zone.Deck, displaced);
  insertCard(bot, Zone.Security, faceDownCard("dev-paildramon-dna-weak-security", "BT1-010", 1), "top");
}

function layBt24SilphymonDnaScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 3);
  const human = state.players[0];
  if (human === undefined) return;
  placePermanent(human, establishedDigimon(0, ["BT24-035"], "-silphymon-dna-gatomon"));
  placePermanent(human, establishedDigimon(0, ["BT24-046"], "-silphymon-dna-garurumon"));
  insertCard(human, Zone.Hand, faceDownCard("dev-silphymon-dna-silphymon", "BT24-037", 0));
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

/** A pending field watcher must disappear when an earlier On Deletion removes its source. */
function layMoonPendingSourceDeletedScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 10);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(human, establishedDigimon(0, ["EX4-050"], "-shadow"));
  placePermanent(human, establishedDigimon(0, ["BT2-090"], "-purple-tamer"));
  insertCard(human, Zone.Hand, faceDownCard("dev-moon-heat-viper", "BT2-109", 0));
  placePermanent(opponent, establishedDigimon(1, ["BT19-075"], "-moon"));
  placePermanent(opponent, establishedDigimon(1, ["BT2-070"], "-tapirmon"));
  while (human.security.length > 0) takeTop(human, Zone.Security);
  for (let index = 0; index < 4; index++)
    insertCard(human, Zone.Security, faceDownCard(`dev-moon-security-${index}`, "BT1-009", 0));
  insertCard(human, Zone.Deck, faceDownCard("dev-moon-recovery", "BT1-009", 0), "top");
  insertCard(human, Zone.Deck, faceDownCard("dev-moon-draw", "BT1-009", 0), "top");
}

/** Discord 1553625807094808700: choose concealed hand positions, then order them. */
function layMirageHiddenHandScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 3);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(human, establishedDigimon(0, ["BT13-033"], "-mirage"));
  for (let index = 0; index < 14; index++) {
    const card = faceDownCard(`dev-mirage-hand-${index}`, index % 2 === 0 ? "BT1-010" : "BT1-009", 1);
    // The match included previously revealed cards: the blind decision must still hide them.
    card.faceUp = index % 2 === 0;
    insertCard(opponent, Zone.Hand, card);
  }
  while (opponent.security.length > 0) takeTop(opponent, Zone.Security);
  insertCard(opponent, Zone.Security, faceDownCard("dev-mirage-security", "BT1-009", 1));
  insertCard(human, Zone.Deck, faceDownCard("dev-mirage-draw", "BT1-085", 0), "top");
}

/** Companion reproductions for ordinary effects, explicit deletion, and attack interruption. */
function layDerivedPriorityScenario(
  state: GameState,
  decks: readonly [Decklist, Decklist],
  kind: "rize" | "trident" | "flashy" | "dominimon",
): void {
  prepareIssueScenario(state, decks, 8);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(opponent, establishedDigimon(1, [kind === "dominimon" ? "BT16-013" : "BT2-070"], "-priority-target"));
  if (kind === "rize") {
    placePermanent(human, establishedDigimon(0, ["BT2-038"], "-priority-rize"));
    placePermanent(human, establishedDigimon(0, ["BT9-092"], "-priority-coolboy"));
    insertCard(human, Zone.Hand, faceDownCard("dev-priority-rize-x", "BT9-041", 0));
  } else if (kind === "trident") {
    placePermanent(human, establishedDigimon(0, ["BT1-085"], "-priority-red"));
    insertCard(human, Zone.Hand, faceDownCard("dev-priority-trident", "BT4-100", 0));
  } else if (kind === "dominimon") {
    placePermanent(human, establishedDigimon(0, ["BT1-060"], "-priority-magna-base"));
    insertCard(human, Zone.Hand, faceDownCard("dev-priority-dominimon", "EX6-030", 0));
    while (human.security.length > 0) takeTop(human, Zone.Security);
    insertCard(human, Zone.Security, faceDownCard("dev-priority-magna-security", "BT1-060", 0));
  } else {
    placePermanent(human, establishedDigimon(0, ["BT1-035"], "-priority-leomon"));
    insertCard(human, Zone.Hand, faceDownCard("dev-priority-flashy", "EX5-068", 0));
  }
  if (kind === "rize" || kind === "trident")
    insertCard(human, Zone.Hand, faceDownCard("dev-priority-marcus", "BT17-087", 0));
  while (opponent.security.length > 0) takeTop(opponent, Zone.Security);
  insertCard(opponent, Zone.Security, faceDownCard("dev-priority-security", "BT1-009", 1));
}

/** A declined OPT remains available for a later effect's deletion in the same chain. */
function layPiedmonDeclinedOptScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 10);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(human, establishedDigimon(0, ["EX4-050"], "-piedmon-shadow"));
  placePermanent(human, establishedDigimon(0, ["EX8-062"], "-piedmon-opt"));
  placePermanent(opponent, establishedDigimon(1, ["BT1-080"], "-piedmon-later-victim"));
  placePermanent(opponent, establishedDigimon(1, ["BT2-070"], "-piedmon-first-victim"));
  insertCard(human, Zone.Hand, faceDownCard("dev-piedmon-heat", "BT2-109", 0));
  insertCard(human, Zone.Trash, faceDownCard("dev-piedmon-revival", "EX8-057", 0));
  while (human.security.length > 0) takeTop(human, Zone.Security);
  for (let i = 0; i < 4; i += 1)
    insertCard(human, Zone.Security, faceDownCard(`dev-piedmon-security-${i}`, "BT1-009", 0));
  insertCard(human, Zone.Deck, faceDownCard("dev-piedmon-recovery", "BT1-009", 0), "top");
}

/** Discord 1553619008077430804: Hellscythe revives MagnaAngemon while deleting Wizardmon. */
function layHellscytheOnPlayPriorityScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 8);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(human, establishedDigimon(0, ["BT8-041"], "-hellscythe-colors"));
  placePermanent(opponent, establishedDigimon(1, ["BT15-036"], "-hellscythe-wizardmon"));
  insertCard(human, Zone.Hand, faceDownCard("dev-hellscythe-option", "BT8-109", 0));
  insertCard(human, Zone.Trash, faceDownCard("dev-hellscythe-magna", "BT1-060", 0));
  insertCard(human, Zone.Deck, faceDownCard("dev-hellscythe-recovery", "BT1-009", 0), "top");
  insertCard(human, Zone.Deck, faceDownCard("dev-hellscythe-draw", "BT1-009", 0), "top");
  while (human.security.length > 0) takeTop(human, Zone.Security);
  while (opponent.security.length > 0) takeTop(opponent, Zone.Security);
  insertCard(human, Zone.Security, faceDownCard("dev-hellscythe-human-security", "BT1-009", 0));
  insertCard(opponent, Zone.Security, faceDownCard("dev-hellscythe-opponent-security", "BT1-009", 1));
}

/** Discord 1553632090715848764: Blast Vikemon, then evolve beyond its live source limit. */
function layVikemonLiveSourceLockScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 10);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(human, establishedDigimon(0, ["BT1-009"], "-vikemon-counter-bait"));
  placePermanent(human, establishedDigimon(0, ["BT1-003", "BT1-030"], "-vikemon-locked-rookie"));
  placePermanent(opponent, establishedDigimon(1, ["BT1-041"], "-vikemon-blast-base"));
  insertCard(human, Zone.Hand, faceDownCard("dev-vikemon-evolution", "BT1-037", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-vikemon-new-arrival", "BT1-030", 0));
  insertCard(opponent, Zone.Hand, faceDownCard("dev-vikemon-counter", "BT16-026", 1));
  insertCard(human, Zone.Deck, faceDownCard("dev-vikemon-draw", "BT1-085", 0), "top");
  insertCard(human, Zone.Deck, faceDownCard("dev-vikemon-evo-draw", "BT1-085", 0), "top");
  while (opponent.security.length > 0) takeTop(opponent, Zone.Security);
  for (let i = 0; i < 3; i += 1) {
    insertCard(opponent, Zone.Security, faceDownCard(`dev-vikemon-security-${i}`, "BT1-009", 1));
  }
}

/** Discord 1553600701442297956: an earlier play, Kotone's DigiXros, then EX6's nested arrival. */
function layKotoneDigiXrosPendingAttackScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 20);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(human, establishedDigimon(0, ["BT19-014", "BT19-035", "P-224"], "-kotone"));
  placePermanent(human, establishedDigimon(0, ["BT21-021", "BT19-061", "BT10-087"], "-kotone-materials"));
  placePermanent(human, establishedDigimon(0, ["BT21-083"], "-kotone-attack"));
  insertCard(human, Zone.Hand, faceDownCard("dev-kotone-earlier-play", "AD1-006", 0));
  // A neutral draw keeps the Start of Main costs optional and adds no DigiXros material.
  insertCard(human, Zone.Deck, faceDownCard("dev-kotone-draw", "BT1-085", 0), "top");
  // A vanilla security check lets the retained EX6 attack finish without another effect.
  while (opponent.security.length > 0) takeTop(opponent, Zone.Security);
  insertCard(opponent, Zone.Security, faceDownCard("dev-kotone-security", "BT1-009", 1));
}

/** Reproduce the logged double-counted hand effect: seven reducers should make the cost five. */
function layBt6BeelStarmonDuplicateCostScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 6);
  const human = state.players[0];
  if (human === undefined) return;
  insertCard(human, Zone.Hand, faceDownCard("dev-beelstarmon-play", "BT6-112", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-beelstarmon-other", "BT6-112", 0));
  const trashCards = ["BT6-112", "BT6-095", "ST14-12", "ST14-12", "BT9-097", "BT9-097", "BT9-097"];
  trashCards.forEach((cardId, index) =>
    insertCard(human, Zone.Trash, faceUpCard(`dev-beelstarmon-trash-${index}`, cardId, 0)),
  );
  insertCard(human, Zone.Deck, faceDownCard("dev-beelstarmon-neutral-draw", "BT1-085", 0), "top");
}

/**
 * Discord bug 1555673696960774224 (match f1c49980): BT20-102 Omnimon (X Antibody)'s board wipe
 * deletes the Omnimon itself when another Digimon is kept. One BT20-100 The Last Guardian has
 * waited since an earlier turn and a second copy is in hand to place this turn. Only the earlier
 * copy may offer ＜Delay＞ (§16-17-3). Four neutral Tamers on top cover the draw and the reveal.
 * The bot keeps Monodramon and loses Garurumon, so the Option breaks alongside a real deletion.
 */
function layBt20LastGuardianOmnimonWipeScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 6);
  const human = state.players[0];
  const bot = state.players[1];
  if (human === undefined || bot === undefined) return;
  const guardian = establishedDigimon(0, ["BT20-100"], "-last-guardian-established");
  guardian.placedByEffect = true;
  placePermanent(human, guardian);
  placePermanent(human, establishedDigimon(0, ["BT5-086"], "-last-guardian-omnimon"));
  placePermanent(human, establishedDigimon(0, ["ST1-07"], "-last-guardian-survivor"));
  insertCard(human, Zone.Hand, faceDownCard("dev-last-guardian-fresh", "BT20-100", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-last-guardian-omnimon-x", "BT20-102", 0));
  for (const index of [0, 1, 2, 3]) {
    insertCard(human, Zone.Deck, faceDownCard(`dev-last-guardian-neutral-${index}`, "BT1-085", 0), "top");
  }
  placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-last-guardian-target"));
  placePermanent(bot, establishedDigimon(1, ["ST2-06"], "-last-guardian-wiped"));
}

/**
 * Reproduce Discord bug 1555578375677018193: BT25-085 BeelStarmon's [When Attacking] unsuspend
 * cost trashes EX7-071 Hurricane Screw Shot from digivolution cards, which must fire its
 * "gain 1 memory".
 */
function layBt25BeelStarmonOptionTrashTriggerScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 5);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(human, establishedDigimon(0, ["EX7-071", "BT10-012", "BT25-085"], "-beelstarmon-bt25"));
  insertCard(human, Zone.Deck, faceDownCard("dev-beelstarmon-bt25-neutral-draw", "BT1-085", 0), "top");
  const target = establishedDigimon(1, ["BT1-009"], "-beelstarmon-bt25-target");
  target.isSuspended = true;
  placePermanent(opponent, target);
}

/**
 * Discord bug 1555578375677018193, effect path: EX7-010 Deputymon's [When Digivolving] trashes
 * P-180 Bind Red Trigger from digivolution cards, which must delete a 7000 DP or lower Digimon.
 */
function layEx7DeputymonOptionTrashTriggerScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 5);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(human, establishedDigimon(0, ["ST1-03"], "-deputymon-base"));
  placePermanent(human, establishedDigimon(0, ["P-180", "BT1-009"], "-deputymon-host"));
  insertCard(human, Zone.Hand, faceDownCard("dev-deputymon", "EX7-010", 0));
  insertCard(human, Zone.Deck, faceDownCard("dev-deputymon-neutral-draw", "BT1-085", 0), "top");
  placePermanent(opponent, establishedDigimon(1, ["BT1-013"], "-deputymon-target"));
}

/**
 * Discord bug 1555502942403043389: digivolving into BT20-014 SaviorHuckmon fires BT23-099's
 * ＜Delay＞, which plays a Sistermon from hand. At end of turn, SaviorHuckmon must offer to suspend
 * that Sistermon and digivolve into the Jesmon in hand for free.
 */
function layBt20SaviorHuckmonEndTurnSistermonScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 5);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  const gym = establishedDigimon(0, ["BT23-099"], "-saviorhuckmon-gym");
  gym.placedByEffect = true;
  placePermanent(human, gym);
  placePermanent(human, establishedDigimon(0, ["BT20-013"], "-saviorhuckmon-base"));
  insertCard(human, Zone.Hand, faceDownCard("dev-saviorhuckmon", "BT20-014", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-saviorhuckmon-sistermon", "BT23-077", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-saviorhuckmon-jesmon", "BT13-017", 0));
  insertCard(human, Zone.Deck, faceDownCard("dev-saviorhuckmon-neutral-draw", "BT1-085", 0), "top");
  for (const slot of ["first", "second"]) {
    placePermanent(opponent, establishedDigimon(1, ["BT1-009"], `-saviorhuckmon-target-${slot}`));
  }
}

/** Reproduce Discord 1555978091187277945: Leopardmon gains memory before both Royal Knights leave. */
function layLeopardmonKingDrasilScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 3);
  const human = state.players[0];
  if (human === undefined) return;
  while (human.eggDeck.length > 0) takeTop(human, Zone.EggDeck);
  const drasil = establishedDigimon(0, ["BT13-007"], "-leopardmon-drasil");
  drasil.inBreeding = true;
  setBreeding(human, drasil);
  // Discord 1555978091187277945, match c9c25632: both ACEs leave together.
  placePermanent(human, establishedDigimon(0, ["BT20-060"], "-leopardmon-ouryuken"));
  placePermanent(human, establishedDigimon(0, ["BT22-052"], "-leopardmon-ace"));
  insertCard(human, Zone.Deck, faceDownCard("dev-leopardmon-neutral-draw", "BT1-085", 0), "top");
}

/**
 * Reproduce Discord bug 1554297556551340062: Omekamon's play registers King Drasil's reducer,
 * then its On Play adds a source. Jesmon must count all four sources (cost 4), not the three
 * seen by the earlier payment window (cost 5).
 */
function layBt13KingDrasilSourceCountScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 10);
  const human = state.players[0];
  if (human === undefined) return;
  const drasil = establishedDigimon(0, ["BT13-007", "BT13-007", "BT13-007"], "-king-drasil");
  drasil.inBreeding = true;
  setBreeding(human, drasil);
  insertCard(human, Zone.EggDeck, faceDownCard("dev-king-drasil-egg", "BT13-007", 0), "top");
  insertCard(human, Zone.Hand, faceDownCard("dev-king-drasil-omekamon", "EX11-053", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-king-drasil-kentaurosmon", "EX13-036", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-king-drasil-jesmon", "EX13-014", 0));
  insertCard(human, Zone.Deck, faceDownCard("dev-king-drasil-neutral-draw", "BT1-085", 0), "top");
}

/**
 * Reproduce Discord bug 1555593718147448942: Omnimon plays Jesmon from under the breeding King
 * Drasil_7D6, and Jesmon's trigger plays an [Atho, René & Por] Token after Omnimon's effect has
 * resolved. "All of your Digimon gain <Rush> for the turn" must reach that later token too.
 */
/**
 * Discord 1555876325355421716, match 59c38adc, 09:33:01 UTC: Leopardmon plays
 * Blanc after Omnimon's Royal Knights play. Omnimon X attacks with Blanc without
 * suspending; Ouryuken returns memory and Blanc must retain a normal attack.
 */
function laySt12BlancRushSecondAttackScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 5);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  const drasil = establishedDigimon(0, ["BT20-102", "BT20-060", "BT22-052", "BT13-007"], "-blanc-rush-drasil");
  drasil.inBreeding = true;
  setBreeding(human, drasil);
  while (human.hand.length > 0) takeTop(human, Zone.Hand);
  while (human.eggDeck.length > 0) takeTop(human, Zone.EggDeck);
  insertCard(human, Zone.EggDeck, faceDownCard("dev-blanc-rush-egg", "BT13-007", 0), "top");
  insertCard(human, Zone.Hand, faceDownCard("dev-blanc-rush-omnimon", "BT13-112", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-blanc-rush-blanc", "ST12-12", 0));
  // The turn draw supplies Blanc's optional hand-trash cost without a second play target.
  insertCard(human, Zone.Deck, faceDownCard("dev-blanc-rush-draw", "BT1-085", 0), "top");
  while (opponent.security.length > 0) takeTop(opponent, Zone.Security);
  for (let index = 0; index < 3; index += 1) {
    insertCard(opponent, Zone.Security, faceDownCard(`dev-blanc-rush-security-${index}`, "EX13-017", 1));
  }
}

function layBt13OmnimonLaterTokenRushScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 10);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  const drasil = establishedDigimon(0, ["EX13-014", "BT13-007"], "-omnimon-rush-drasil");
  drasil.inBreeding = true;
  setBreeding(human, drasil);
  insertCard(human, Zone.EggDeck, faceDownCard("dev-omnimon-rush-egg", "BT13-007", 0), "top");
  insertCard(human, Zone.Hand, faceDownCard("dev-omnimon-rush-omnimon", "BT13-112", 0));
  insertCard(human, Zone.Deck, faceDownCard("dev-omnimon-rush-neutral-draw", "BT1-085", 0), "top");
  placePermanent(opponent, establishedDigimon(1, ["BT1-009"], "-omnimon-rush-target"));
}

/** Discord 1555883726292914187: a nested evolution removes a pending field watcher. */
function layZombiePlutomonRemovedTriggerScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 10);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(human, establishedDigimon(0, ["BT22-004", "BT22-044", "BT22-044"], "-zombie-repro-host"));
  placePermanent(opponent, establishedDigimon(1, ["BT26-059", "BT26-079"], "-zombie-repro-target"));
  insertCard(human, Zone.Hand, faceDownCard("dev-zombie-repro-evolution", "BT22-056", 0));
  for (let index = 0; index < 5; index += 1) {
    insertCard(human, Zone.Hand, faceDownCard(`dev-zombie-repro-hand-${index}`, "BT1-009", 0));
  }
  for (let index = 0; index < 6; index += 1) {
    insertCard(opponent, Zone.Hand, faceDownCard(`dev-zombie-repro-opponent-hand-${index}`, "BT1-009", 1));
  }
  for (let index = 0; index < 3; index += 1) {
    insertCard(human, Zone.Deck, faceDownCard(`dev-zombie-repro-draw-${index}`, "BT1-009", 0), "top");
  }
}

/**
 * Reproduce Discord bug 1555502942403043389: SnowGoblimon trashes Plutomon from the hand, so both
 * inherited Titan digivolutions trigger. Salamon's digivolves into Plutomon, whose
 * [When Digivolving] trashes ZombiePlutomon; Hyogamon's must still digivolve into it.
 */
function layBt24HyogamonPendingTrashDigivolveScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 1);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(human, establishedDigimon(0, ["BT26-066", "BT24-026", "BT26-074"], "-hyogamon-host"));
  insertCard(human, Zone.Hand, faceDownCard("dev-hyogamon-snowgoblimon", "BT24-021", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-hyogamon-fugamon-cost", "BT24-075", 0));
  insertCard(human, Zone.Trash, faceUpCard("dev-hyogamon-fugamon", "BT24-013", 0));
  // Top to bottom: turn draw, SnowGoblimon's three reveals, then Plutomon's digivolution draw.
  const deckTop = ["BT1-085", "BT26-059", "BT1-009", "BT1-010", "BT26-079"];
  const deckIds = ["draw", "plutomon", "reveal-miss-1", "reveal-miss-2", "zombie-plutomon"];
  for (let index = deckTop.length - 1; index >= 0; index -= 1) {
    insertCard(human, Zone.Deck, faceDownCard(`dev-hyogamon-${deckIds[index]}`, deckTop[index]!, 0), "top");
  }
  placePermanent(opponent, establishedDigimon(1, ["BT1-009"], "-hyogamon-target"));
}

/**
 * Reproduce Discord bug 1555206206417674281: DarknessBagramon DigiXroses with DarkKnightmon from
 * the battle area. DarkKnightmon's "would leave" effect plays ChuuChuumon while DarknessBagramon
 * is only revealed; both [On Play] effects then wait for one ordering prompt.
 */
function layEx10DarknessBagramonDigiXrosInterruptScenario(
  state: GameState,
  decks: readonly [Decklist, Decklist],
): void {
  prepareIssueScenario(state, decks, 16);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(human, establishedDigimon(0, ["BT10-073", "BT1-009", "EX10-031"], "-dark-knightmon"));
  insertCard(human, Zone.Hand, faceDownCard("dev-darkness-bagramon", "EX10-059", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-darkness-bagramon-bagramon", "EX10-056", 0));
  insertCard(human, Zone.Deck, faceDownCard("dev-darkness-bagramon-reveal", "BT10-075", 0), "top");
  insertCard(human, Zone.Deck, faceDownCard("dev-darkness-bagramon-draw", "BT1-085", 0), "top");
  placePermanent(opponent, establishedDigimon(1, ["BT1-013"], "-darkness-bagramon-target"));
  insertCard(opponent, Zone.Hand, faceDownCard("dev-darkness-bagramon-opponent-hand", "BT1-009", 1));
}

/**
 * Follow-up to Discord bug 1555206206417674281: Bagramon DigiXroses with SkullKnightmon from the
 * battle area. A DigiXros is not an effect (Q2352), so Tactimon's "would leave by effects"
 * prevention must not be offered.
 */
function layEx10TactimonDigiXrosMaterialScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 12);
  const human = state.players[0];
  if (human === undefined) return;
  placePermanent(human, establishedDigimon(0, ["BT1-009", "BT1-013", "EX10-055"], "-tactimon"));
  placePermanent(human, establishedDigimon(0, ["EX10-026"], "-skull-knightmon"));
  insertCard(human, Zone.Hand, faceDownCard("dev-tactimon-bagramon", "EX10-056", 0));
  insertCard(human, Zone.Deck, faceDownCard("dev-tactimon-draw", "BT1-085", 0), "top");
}

function layIssue4893SeitenEvoCostScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 4);
  const human = state.players[0];
  if (human === undefined) return;
  placePermanent(human, establishedDigimon(0, ["EX12-015"], "-issue-4893-gokuumon"));
  insertCard(human, Zone.Hand, faceDownCard("dev-issue-4893-seiten", "EX12-048", 0));
}

/**
 * Jesmon attacking with an "Atho, René & Por" token already in play. Its [When Attacking] modal
 * must withhold the token bullet and offer only the Sistermon route (issue #4894).
 */
function layIssue4894JesmonTokenLimitScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 3);
  const human = state.players[0];
  if (human === undefined) return;
  placePermanent(human, establishedDigimon(0, ["BT6-015", "BT23-013"], "-issue-4894-jesmon"));
  placePermanent(human, establishedDigimon(0, ["TOKEN-AthoRenePor-Token"], "-issue-4894-token"));
  insertCard(human, Zone.Hand, faceDownCard("dev-issue-4894-ciel", "BT10-085", 0));
}

function layJesmonScrambleDpScenario(
  state: GameState,
  decks: readonly [Decklist, Decklist],
  withTenThousandDp: boolean,
): void {
  prepareIssueScenario(state, decks, 5);
  const human = state.players[0];
  const opponent = state.players[1];
  if (human === undefined || opponent === undefined) return;
  placePermanent(human, establishedDigimon(0, ["EX13-009"], "-jesmon-scramble-huckmon"));
  insertCard(human, Zone.Hand, faceDownCard("dev-jesmon-scramble-option", "LM-027", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-jesmon-scramble-jesmon", "BT23-013", 0));
  // The opening draw must not add another red Digimon to the Scramble selection.
  insertCard(human, Zone.Deck, faceDownCard("dev-jesmon-scramble-draw", "BT1-085", 0), "top");
  placePermanent(opponent, establishedDigimon(1, ["AD1-010"], "-jesmon-scramble-garurumon"));
  placePermanent(opponent, establishedDigimon(1, ["EX1-066"], "-jesmon-scramble-analog-youth"));
  if (withTenThousandDp) {
    placePermanent(opponent, establishedDigimon(1, ["BT1-024"], "-jesmon-scramble-10000-dp"));
  }
}

function layEx11RyutaroSuspendedScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 10);
  const human = state.players[0];
  if (human === undefined) return;
  placePermanent(human, establishedDigimon(0, ["EX11-010"], "-ex11-trigger-first"));
  placePermanent(human, establishedDigimon(0, ["EX11-010"], "-ex11-trigger-second"));
  const ryutaro = establishedDigimon(0, ["EX11-056"], "-ex11-ryutaro");
  placePermanent(human, ryutaro);
  const breeding = establishedDigimon(0, ["EX11-009"], "-ex11-breeding");
  breeding.inBreeding = true;
  setBreeding(human, breeding);
  insertCard(human, Zone.Hand, faceDownCard("dev-ex11-trigger-evolution-first", "EX8-016", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-ex11-trigger-evolution-second", "EX11-011", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-ex11-breeding-dinomon", "EX11-011", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-ex11-breeding-mastertyrannomon", "EX11-010", 0));
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

/** Mervamon effect-plays Aegiochusmon: Dark from trash, which can declare Assembly. */
function layMervamonEffectAssemblyScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 13);
  const human = state.players[0];
  if (human === undefined) return;
  insertCard(human, Zone.Hand, faceDownCard("dev-mervamon", "BT26-081", 0));
  insertCard(human, Zone.Trash, faceUpCard("dev-mervamon-dark", "BT26-073", 0));
  insertCard(human, Zone.Trash, faceUpCard("dev-mervamon-assembly-material", "BT26-069", 0));
}

/**
 * Reproduces the reported ＜Succession＞ gap on Chronomon: Destroy Mode (BT26-060), which gains
 * every effect other than ＜Succession＞ on its topmost Lv.6 [Chronomon] digivolution card
 * (CR 16-47-1) — so Chronomon: Holy Mode's [When Digivolving] must fire alongside Destroy
 * Mode's own.
 *
 * Both routes Destroy Mode reaches the field by are on the board:
 *
 *  - Chronomon: Holy Mode in play with Destroy Mode in hand and memory for its alternate
 *    Lv.6-[Chronomon] cost: the player's OWN digivolution, exactly as reported.
 *  - Giant Slayer carrying Holy Mode as its topmost Lv.6 [Chronomon] card: attacking the
 *    suspended 20000 DP Titamon loses the battle, and its [All Turns] replacement digivolves
 *    Destroy Mode in from hand for free. That is an EFFECT-driven digivolution, the path where
 *    the conferred [When Digivolving] used to be dropped while [When Attacking] kept working.
 *
 * The bot's single Digimon carries stacked cards so both effects have something to do — Holy
 * Mode deletes it, Destroy Mode returns its stacked cards — and the human's trash holds the
 * three cards Holy Mode's ＜Recovery +1＞ condition returns to the bottom of the deck.
 */
function layBt26ChronomonDmSuccessionScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT26-073", "BT26-016"], "-bt26-holy-mode"));
    placePermanent(human, establishedDigimon(0, ["BT26-016", "BT26-085"], "-bt26-giant-slayer"));
    insertCard(human, Zone.Hand, faceDownCard("dev-bt26-destroy-mode", "BT26-060", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-bt26-destroy-mode-2", "BT26-060", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-bt26-recovery-cost-1", "BT1-009", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-bt26-recovery-cost-2", "BT1-009", 0));
    insertCard(human, Zone.Trash, faceUpCard("dev-bt26-recovery-cost-3", "BT1-009", 0));
  }

  const bot = state.players[1];
  if (bot !== undefined) {
    // Exactly ONE opposing Digimon, because Giant Slayer's ＜Collision＞ forces a Digimon to block:
    // with a second, smaller Digimon on the board the bot blocks with that one instead, Giant
    // Slayer wins and the replacement digivolution never happens.
    //
    // 16000 DP: more than Giant Slayer's 14000, so it wins the battle and that deletion fires the
    // replacement; no more than Destroy Mode's 16000, so Holy Mode's conferred "delete 1 Digimon
    // with as much DP as this Digimon or less" still has a legal target afterwards. Its stacked
    // cards are what Destroy Mode's own [When Digivolving] returns to the deck.
    const battleWinner = establishedDigimon(1, ["BT1-009", "BT1-015", "BT1-080"], "-bt26-battle-winner");
    battleWinner.isSuspended = true;
    battleWinner.baseDP = 16000;
    battleWinner.currentDP = 16000;
    placePermanent(bot, battleWinner);
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 6;
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

/**
 * Discord bug 1552867266469568643: EX13-045 Examon's "when this Digimon wins a battle" jumped
 * ahead of the triggers from its own forced attack. DNA digivolving Wingdramon (Bebydomon
 * under it) + Groundramon into Examon declares the attack, which suspends Examon (Wingdramon's
 * inherited "when this Digimon suspends") and triggers Bebydomon's inherited [When Attacking].
 * Examon's "may battle" then deletes the opponent's Digimon. After the [When Digivolving]
 * effect finishes, all of those triggers must wait in one ordering prompt (Q7366).
 */
function layEx13ExamonBattleWinTimingScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["EX13-005", "EX13-021"], "-examon-win-wingdramon"));
    placePermanent(human, establishedDigimon(0, ["EX13-041"], "-examon-win-groundramon"));
    insertCard(human, Zone.Hand, faceDownCard("dev-examon-win-examon", "EX13-045", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-examon-win-dracomon", "ST8-03", 0));
  }

  const opponent = state.players[1];
  if (opponent !== undefined) placePermanent(opponent, establishedDigimon(1, ["BT1-013"], "-examon-win-prey"));

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * EX5-069 Biting Crush's ＜Delay＞ window (Discord bug: "Biting Crush not playing Leviamon from
 * trash"). Biting Crush sits in the human's battle area from an earlier turn, with EX5-063
 * Leviamon in the trash. Playing EX5-058 Fujitsumon puts a Fujitsumon Token into the OPPONENT's
 * battle area by effect, which is "an effect plays an opponent's Digimon" — KB Q3678 confirms
 * the clause fires on your own effects too. The window must open at that play, not in a later
 * Main phase.
 */
function layEx5BitingCrushDelayScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    // An Option lives on the battle area only because an effect placed it there (rule 17-1-3-2-2),
    // and ＜Delay＞ reads the arrival turn, so it must also predate this turn.
    const bitingCrush = establishedDigimon(0, ["EX5-069"], "-ex5-biting-crush");
    bitingCrush.placedByEffect = true;
    placePermanent(human, bitingCrush);
    insertCard(human, Zone.Trash, faceUpCard("dev-ex5-leviamon", "EX5-063", 0));
    insertCard(human, Zone.Hand, faceDownCard("dev-ex5-fujitsumon", "EX5-058", 0));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 6;
}

/**
 * P-108 Wisdom Training's ＜Delay＞ (Discord bug 1552841036315762720, match 556eb69b). Wisdom
 * Training sits in the human's battle area from an earlier turn with BT2-073 Garurumon in hand.
 * Without a host, trashing it must still be legal (CR 15-7-5, 16-17-1, Q5710) and simply
 * digivolves nothing; with BT2-068 Impmon on the field, the Delay digivolves it for 2 - 2 memory.
 */
function layP108TrainingDelayScenario(
  state: GameState,
  decks: readonly [Decklist, Decklist],
  withTarget: boolean,
): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }

  const human = state.players[0];
  if (human !== undefined) {
    const training = establishedDigimon(0, ["P-108"], "-p108-training");
    training.placedByEffect = true;
    placePermanent(human, training);
    if (withTarget) placePermanent(human, establishedDigimon(0, ["BT2-068"], "-p108-host"));
    insertCard(human, Zone.Hand, faceDownCard("dev-p108-garurumon", "BT2-073", 0));
  }

  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 3;
}

/**
 * BT13-110 Royal Knights of the Purge ＜Delay＞ (Discord bug 1554301049614110770, match
 * dd487753). The Option has waited in the battle area since an earlier turn, and King
 * Drasil_7D6 holds BT20-102 Omnimon (X Antibody) among its breeding digivolution cards. Two
 * BT20-091 Tamers react to the play, and King Drasil offers its play-cost replacement, so the
 * Delay resolves through the same interruptions as the logged turn. The played Omnimon must be
 * offered an attack: the Delay grants ＜Rush＞ as its final instruction.
 */
function layBt13RoyalPurgeDelayRushScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 1);
  const human = state.players[0];
  const bot = state.players[1];
  if (human === undefined || bot === undefined) return;
  const purge = establishedDigimon(0, ["BT13-110"], "-bt13-royal-purge");
  purge.placedByEffect = true;
  placePermanent(human, purge);
  placePermanent(human, establishedDigimon(0, ["BT20-091"], "-bt13-royal-purge-tamer-first"));
  placePermanent(human, establishedDigimon(0, ["BT20-091"], "-bt13-royal-purge-tamer-second"));
  const drasil = establishedDigimon(0, ["BT20-102", "BT13-007", "BT13-007"], "-bt13-royal-purge-drasil");
  drasil.inBreeding = true;
  setBreeding(human, drasil);
  placePermanent(bot, establishedDigimon(1, ["BT1-009"], "-bt13-royal-purge-target"));
}

/**
 * P-206 Digital Gate Open ＜Delay＞ (Discord bug 1554891698088185917, match 8ae52904). The only
 * Digimon on the human's field is a red Monodramon in the breeding area, which is part of the
 * field. The Delay must offer the red Tai Kamiya and never the blue Matt Ishida.
 */
function layP206DigitalGateBreedingColorScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  prepareIssueScenario(state, decks, 3);
  const human = state.players[0];
  if (human === undefined) return;
  const gate = establishedDigimon(0, ["P-206"], "-p206-gate");
  gate.placedByEffect = true;
  placePermanent(human, gate);
  const monodramon = establishedDigimon(0, ["BT1-009"], "-p206-breeding");
  monodramon.inBreeding = true;
  setBreeding(human, monodramon);
  insertCard(human, Zone.Hand, faceDownCard("dev-p206-tai", "BT1-085", 0));
  insertCard(human, Zone.Hand, faceDownCard("dev-p206-matt", "BT1-086", 0));
}

/**
 * EX13-077 Omnimon: Merciful Mode (Discord bug 1554922883652784198, match f9505ba7, turn 6). The
 * board as it stood at 18:21:37 UTC, right before Kargalargus played Merciful Mode with Assembly,
 * rebuilt from the production log. Hands come from the decision payloads. The log does not
 * narrate security Digimon deleted in battle, so AD1-004 and ST21-07 are added to the human's
 * trash. Three of the bot's five security cards were never revealed; they come from its remaining
 * deck. The human's AD1-019 draw-phase card sits on top of their deck so the scenario's own draw
 * restores the logged hand of seven.
 */
function layEx13MercifulModeAttackOrderScenario(state: GameState): void {
  const human = state.players[0];
  const bot = state.players[1];
  if (human === undefined || bot === undefined) return;
  const remainingDecks: Record<Seat, Decklist> = {
    0: {
      mainDeck: [
        "ST21-07",
        "BT21-102",
        "ST20-09",
        "BT21-075",
        "ST21-08",
        "ST21-10",
        "EX13-073",
        "ST21-07",
        "BT21-061",
        "EX13-077",
        "AD1-022",
        "EX13-073",
        "ST20-06",
        "ST20-03",
        "ST20-03",
        "AD1-014",
        "ST20-02",
        "ST20-02",
        "AD1-014",
        "AD1-004",
        "ST21-05",
        "ST21-05",
        "ST20-03",
        "BT21-061",
      ],
      eggDeck: ["ST21-01", "ST21-01"],
    },
    1: {
      mainDeck: [
        "BT24-100",
        "BT24-043",
        "BT25-050",
        "BT25-009",
        "BT24-085",
        "BT25-095",
        "BT24-043",
        "BT25-054",
        "BT24-034",
        "BT24-100",
        "BT25-020",
        "BT25-013",
        "BT24-034",
        "BT25-058",
        "BT25-047",
        "BT25-016",
        "BT25-016",
        "BT25-047",
        "BT24-085",
        "BT25-008",
        "BT26-081",
        "BT26-081",
        "BT24-100",
        "BT25-047",
        "BT24-094",
        "BT24-102",
        "BT26-092",
        "BT24-034",
        "BT25-009",
        "BT24-034",
      ],
      eggDeck: ["BT24-004", "BT24-004"],
    },
  };
  for (const seat of [0, 1] as const) {
    const player = state.players[seat]!;
    loadDeckInto(player, seat, remainingDecks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  // The three Tamers' Start of Main effects gain 3; in the match SkullGreymon arrived later in
  // the turn, so only AD1-019 gained and Merciful Mode was played at 0 memory instead of 3.
  state.memory = 0;

  insertCard(human, Zone.Deck, faceDownCard("dev-merciful-draw", "AD1-019", 0), "top");
  ["EX13-077", "ST20-02", "AD1-019", "AD1-022", "BT21-067", "ST21-10"].forEach((id, index) =>
    insertCard(human, Zone.Hand, faceDownCard(`dev-merciful-hand-${index}`, id, 0)),
  );
  [
    "ST20-06",
    "EX13-077",
    "ST21-01",
    "BT21-067",
    "EX9-019",
    "ST20-09",
    "ST20-02",
    "ST21-05",
    "EX9-019",
    "AD1-014",
    "AD1-004",
    "ST21-07",
    "AD1-004",
    "AD1-022",
  ].forEach((id, index) => insertCard(human, Zone.Trash, faceUpCard(`dev-merciful-trash-0-${index}`, id, 0)));
  placePermanent(human, establishedDigimon(0, ["AD1-019"], "-merciful-matt-tk"));
  const firstTaiMatt = establishedDigimon(0, ["EX13-073"], "-merciful-tai-matt-1");
  firstTaiMatt.isSuspended = true;
  placePermanent(human, firstTaiMatt);
  const secondTaiMatt = establishedDigimon(0, ["EX13-073"], "-merciful-tai-matt-2");
  secondTaiMatt.isSuspended = true;
  placePermanent(human, secondTaiMatt);
  placePermanent(human, establishedDigimon(0, ["ST21-08", "BT21-075"], "-merciful-skullgreymon"));
  const gabumon = establishedDigimon(0, ["ST21-01", "ST21-10"], "-merciful-breeding");
  gabumon.inBreeding = true;
  setBreeding(human, gabumon);

  ["BT25-058", "BT25-086", "BT1-089", "BT25-008", "BT25-095", "BT26-081", "BT25-058"].forEach((id, index) =>
    insertCard(bot, Zone.Hand, faceDownCard(`dev-merciful-bot-hand-${index}`, id, 1)),
  );
  insertCard(bot, Zone.Trash, faceUpCard("dev-merciful-trash-1-0", "BT24-041", 1));
  for (let index = 0; index < 3; index += 1) {
    const card = takeTop(bot, Zone.Deck);
    if (card !== undefined) insertCard(bot, Zone.Security, card);
  }
  insertCard(bot, Zone.Security, faceDownCard("dev-merciful-security-bt26-090", "BT26-090", 1), "top");
  insertCard(bot, Zone.Security, faceDownCard("dev-merciful-security-bt25-039", "BT25-039", 1), "top");
  placePermanent(bot, establishedDigimon(1, ["BT24-004", "BT25-008", "BT26-022"], "-merciful-sorcermon"));
  const homeros = establishedDigimon(1, ["BT24-102"], "-merciful-homeros");
  homeros.isSuspended = true;
  placePermanent(bot, homeros);
  placePermanent(bot, establishedDigimon(1, ["BT24-041", "BT26-081"], "-merciful-mervamon"));
  placePermanent(bot, establishedDigimon(1, ["BT25-054", "BT25-020"], "-merciful-marsmon"));
  placePermanent(bot, establishedDigimon(1, ["BT25-008"], "-merciful-coronamon"));
  placePermanent(bot, establishedDigimon(1, ["BT24-043"], "-merciful-tapirmon"));
  placePermanent(bot, establishedDigimon(1, ["BT25-016"], "-merciful-grapleomon"));
  setBreeding(bot, establishedDigimon(1, ["BT24-004"], "-merciful-bot-breeding"));
  bot.breeding!.inBreeding = true;
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

/**
 * Counter timing on a crowded mobile board: the bot attacks while the viewer holds BT20-045
 * Examon, which Blast DNA Digivolves from BT20-027 Slayerdramon on the field plus BT20-044
 * Breakdramon in hand.
 * The extra permanents fill the battle row so the counter prompt's overlap is visible.
 */
function layCounterBlastDnaScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    for (let n = 0; n < OPENING_HAND_SIZE - 1; n += 1) {
      const card = takeTop(player, Zone.Deck);
      if (card !== undefined) insertCard(player, Zone.Hand, card);
    }
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    placePermanent(human, establishedDigimon(0, ["BT20-025", "BT20-027"], "-counter-slayerdramon"));
    placePermanent(human, establishedDigimon(0, ["BT20-007"], "-counter-filler-1"));
    placePermanent(human, establishedDigimon(0, ["BT20-012"], "-counter-filler-2"));
    placePermanent(human, establishedDigimon(0, ["BT20-009"], "-counter-filler-3"));
    insertCard(human, Zone.Hand, faceDownCard("dev-counter-breakdramon", "BT20-044", 0), "top");
    insertCard(human, Zone.Hand, faceDownCard("dev-counter-examon", "BT20-045", 0), "top");
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["BT20-009"], "-counter-attacker"));
    placePermanent(bot, establishedDigimon(1, ["BT20-012"], "-counter-bystander"));
  }
  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
}

/**
 * Discord 1555244967428100348: during the bot's turn, BT20-093's ＜Delay＞ DNA digivolves
 * Breakdramon and the suspended Slayerdramon into BT23-047 Examon. Only the turn player can
 * attack (CR 11-1-2, KB Q2891), so Examon's "this Digimon may attack" must not be offered.
 */
function layBt23ExamonOpponentTurnDnaScenario(state: GameState, decks: readonly [Decklist, Decklist]): void {
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    shuffleDecks(player, makeRng(seatSeed(DEV_SCENARIO_SEED, seat)));
    setSecurityStack(player);
  }
  const human = state.players[0];
  if (human !== undefined) {
    // An Option lives on the battle area only because an effect placed it there (rule 17-1-3-2-2),
    // and ＜Delay＞ reads the arrival turn, so it must also predate this turn.
    const gene = establishedDigimon(0, ["BT20-093"], "-examon-gene");
    gene.placedByEffect = true;
    placePermanent(human, gene);
    // Suspended, so Slayerdramon's own "by suspending this Digimon, they don't leave" can't
    // compete with ＜Delay＞.
    const slayerdramon = establishedDigimon(0, ["BT20-027"], "-examon-blue");
    slayerdramon.isSuspended = true;
    placePermanent(human, slayerdramon);
    placePermanent(human, establishedDigimon(0, ["BT20-044"], "-examon-green"));
    insertCard(human, Zone.Hand, faceDownCard("dev-examon-bt23", "BT23-047", 0));
  }
  const bot = state.players[1];
  if (bot !== undefined) {
    placePermanent(bot, establishedDigimon(1, ["ST2-06"], "-examon-target"));
    insertCard(bot, Zone.Hand, faceDownCard("dev-examon-bounce", "ST2-16", 1));
    insertCard(bot, Zone.Deck, faceDownCard("dev-examon-bounce-draw", "ST2-16", 1), "top");
  }
  state.turnSeat = 1;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 7;
}

const LAYOUTS: Record<DevScenarioId, typeof layBattleScenario> = {
  "arena-mervamon-trash-digixros": layMervamonTrashDigiXrosScenario,
  "arena-taiki-digixros-any-tamer-hand": layTaikiAnyTamerDigiXrosScenario,
  "arena-kotone-digixros-any-tamer-effect": (state, decks) => layTaikiAnyTamerDigiXrosScenario(state, decks, true),
  battle: layBattleScenario,
  "field-grouping": layFieldGroupingScenario,
  "arena-field-grouping-dense": layDenseFieldGroupingScenario,
  arena: layArenaScenario,
  "arena-aegiochus-dark-assembly": layAegiochusDarkAssemblyScenario,
  "arena-alliance-20": layAllianceTwentyScenario,
  "arena-marcus-alliance": layMarcusAllianceScenario,
  "arena-bt26-monimon-optional-cost": layBt26MonimonOptionalCostScenario,
  "arena-bt11-analogman-redirect-timing": layBt11AnalogmanRedirectTimingScenario,
  "arena-bt11-rina-ulforce-immunity": layBt11RinaUlforceImmunityScenario,
  "arena-bt11-rina-ulforce-effect-choice": layBt11RinaUlforceEffectChoiceScenario,
  "arena-rina-evade-unsuspend": layRinaEvadeUnsuspendScenario,
  "arena-ex3-wingdramon-evade-suspend-lock": layEx3WingdramonEvadeSuspendLockScenario,
  "arena-ex13-wingdramon-evade-suspend-lock": layEx13WingdramonEvadeSuspendLockScenario,
  "arena-bt20-grademon-redirect": layBt20GrademonRedirectScenario,
  "arena-bt20-bakemon-violet-retroactive": layBt20BakemonVioletRetroactiveScenario,
  "arena-bt23-bakemon-no-target": layBt23BakemonNoTargetScenario,
  "arena-bt20-invisimon-empty-stack": (state, decks) => layBt20InvisimonSecurityScenario(state, decks, ["BT20-055"]),
  "arena-bt20-invisimon-stacked": (state, decks) =>
    layBt20InvisimonSecurityScenario(state, decks, ["BT20-050", "BT20-054", "BT20-055"]),
  "arena-bt20-takemikazuchi-turn-continue": layBt20TakemikazuchiTurnContinueScenario,
  "arena-bt16-phoenixmon-x-antibody-name": layBt16PhoenixmonXAntibodyNameScenario,
  "arena-bt21-davis-top-stack": layBt21DavisTopStackScenario,
  "arena-bt21-dogatchmon-link-attack": layBt21DogatchmonLinkAttackScenario,
  "arena-bt24-sonic-shot-decline-link": layBt24SonicShotDeclineLinkScenario,
  "arena-bt26-chronomon-dm-succession": layBt26ChronomonDmSuccessionScenario,
  "arena-bt8-digimon-emperor-breeding-memory": layBt8DigimonEmperorBreedingMemoryScenario,
  "arena-face-up-security": layFaceUpSecurityScenario,
  "arena-ex13-grademon-immunity": layEx13GrademonImmunityScenario,
  "arena-diarbbitmon-dual-option-immunity": layDiarbbitmonDualOptionImmunityScenario,
  "arena-ex7-seventh-fascination-turn": layEx7SeventhFascinationTurnScenario,
  "arena-ad1-adventure-tamers-security": layAd1AdventureTamersSecurityScenario,
  "arena-lm067-gundramon-free-option": layLm067GundramonFreeOptionScenario,
  "arena-bt10-taiki-x7-xros-heart": layBt10TaikiX7XrosHeartScenario,
  "arena-ex13-sampson-face-down-sources": layEx13SampsonFaceDownSourcesScenario,
  "arena-p240-arcturusmon-vb-routes": layP240ArcturusmonVbRoutesScenario,
  "arena-p240-arcturusmon-ordered-placement": layP240ArcturusmonOrderedPlacementScenario,
  "arena-ex12-proximamon-dual-siriusmon": layEx12ProximamonDualSiriusmonScenario,
  "arena-ex12-siriusmon-group-placement": layEx12SiriusmonGroupPlacementScenario,
  "arena-ex12-virus-busters-effect-attack": layEx12VirusBustersEffectAttackScenario,
  "arena-ex12-diarbbitmon-option-trigger-timing": layEx12DiarbbitmonOptionTriggerTimingScenario,
  "arena-bt15-leviamon-x-played-subject-left": layBt15LeviamonXPlayedSubjectLeftScenario,
  "arena-ex7-seventh-fascination-trash-turn": (state, decks) =>
    layEx7SeventhFascinationTurnScenario(state, decks, true),
  "arena-ex13-leopardmon-suspended-target": layEx13LeopardmonSuspendedTargetScenario,
  "arena-ex13-leopardmon-unsuspend-lock": layEx13LeopardmonUnsuspendLockScenario,
  "arena-ex13-breakdramon-zero-security-check": layEx13BreakdramonZeroSecurityCheckScenario,
  "arena-decoy-protect-choice": layDecoyProtectChoiceScenario,
  "arena-p245-kakkinmon-full-hand-suspend": layP245KakkinmonFullHandSuspendScenario,
  "arena-ex13-alphamon-end-turn-attack": layEx13AlphamonEndTurnAttackScenario,
  "arena-bt20-dragon-gene-skip-play": layBt20DragonGeneSkipPlayScenario,
  "arena-bt26-rosemon-option-digivolve-lock": layBt26RosemonOptionDigivolveLockScenario,
  "arena-bt26-ravemon-nested-on-deletion": layBt26RavemonNestedOnDeletionScenario,
  "arena-bt26-yoshino-trigger-stack": layBt26YoshinoTriggerStackScenario,
  "arena-bt26-ravemon-recycled-trigger": layBt26RavemonRecycledTriggerScenario,
  "arena-bt26-yoshino-match-b3759aa7": layBt26YoshinoMatchScenario,
  "arena-bt22-rie-kishibe-delete-without-digivolve": layBt22RieKishibeDeleteWithoutDigivolveScenario,
  "arena-bt24-fugamon-self-trash": layBt24FugamonSelfTrashScenario,
  "arena-bt2-kurisarimon-repeat-memory": layBt2KurisarimonRepeatMemoryScenario,
  "arena-bt2-kurisarimon-start-main-memory": (state, decks) =>
    layBt2KurisarimonRepeatMemoryScenario(state, decks, true),
  "arena-ex12-metalgarurumon-trash-then-return": layEx12MetalGarurumonTrashThenReturnScenario,
  "arena-bt22-palmon-cs-restack": layBt22PalmonCsRestackScenario,
  "arena-bt22-mirei-play-cost-floor": layBt22MireiPlayCostFloorScenario,
  "arena-bt12-mikemon-own-battle-only": layBt12MikemonOwnBattleOnlyScenario,
  "arena-bt14-chuumon-security-reveal": layBt14ChuumonSecurityRevealScenario,
  "arena-bt20-omnimon-each-player-survivor": layBt20OmnimonEachPlayerSurvivorScenario,
  "arena-bt20-ouryuken-reduction-resumes": layBt20OuryukenReductionResumesScenario,
  "arena-ex13-gotsumon-blocker-search": layEx13GotsumonBlockerSearchScenario,
  "arena-ex13-craniamon-assembly": layEx13CraniamonAssemblyScenario,
  "arena-p220-millenniummon-assembly": layP220MillenniummonAssemblyScenario,
  "arena-ex9-kimeramon-skullgreymon-assembly": layEx9KimeramonSkullGreymonAssemblyScenario,
  "arena-bt24-masterblimpmon-assembly": layBt24MasterBlimpmonAssemblyScenario,
  "arena-bt22-boltmon-assembly": layBt22BoltmonAssemblyScenario,
  "arena-ex13-gotsumon-promo-knightmon": layEx13GotsumonPromoKnightmonScenario,
  "arena-rainbow-evo-cost": layRainbowEvoCostScenario,
  "arena-sukamon-transform-digivolve-viewer": laySukamonTransformDigivolveViewerScenario,
  "arena-sukamon-transform-digivolve": laySukamonTransformDigivolveScenario,
  "arena-mightyaxe-mode-digixros": layMightyAxeModeDigiXrosScenario,
  "arena-hand-reconnect-sync": layHandReconnectSyncScenario,
  "arena-p097-zubamon-reveal-order": layP097ZubamonRevealOrderScenario,
  "arena-p246-motimon-kingetemon": (state, decks) => layP246MotimonScenario(state, decks, "kingEtemonOnTop"),
  "arena-p246-motimon-after-de-digivolve": (state, decks) => layP246MotimonScenario(state, decks, "afterDeDigivolve"),
  "arena-de-digivolve-visibility": (state, decks) => layP246MotimonScenario(state, decks, "botDeDigivolves"),
  "arena-st24-dna-charge-start-of-main": laySt24DnaChargeStartOfMainScenario,
  "arena-bt21-dracomon-start-main": layDracomonStartMainScenario,
  "arena-ex13-giromon-block-triggers": layEx13GiromonBlockTriggersScenario,
  "arena-ex13-kentaurosmon-each-player-security": layEx13KentaurosmonEachPlayerSecurityScenario,
  "arena-ex13-kentaurosmon-two-counters": (state, decks) =>
    layEx13KentaurosmonEachPlayerSecurityScenario(state, decks, 2),
  "arena-ex13-deletion-trigger-ordering": layEx13DeletionTriggerOrderingScenario,
  "arena-gate-deadly-sins-effect-order": layGateDeadlySinsEffectOrderScenario,
  "arena-rika-optional-effect-presets": layRikaOptionalEffectPresetsScenario,
  "arena-davis-optional-effect-presets": layDavisOptionalEffectPresetsScenario,
  "arena-ukkomon-optional-effect-presets": layUkkomonOptionalEffectPresetsScenario,
  "arena-drasil-optional-effect-presets": layDrasilOptionalEffectPresetsScenario,
  "arena-matt-repeated-effect-presets": layMattRepeatedEffectPresetsScenario,
  "arena-ex13-kings-opponent-sukamon": layEx13KingsOpponentSukamonScenario,
  "arena-ex13-kingsukamon-immunity-lapse": layEx13KingSukamonZeroDpScenario,
  "arena-ex12-susanoomon-later-arrival-dp": layEx12SusanoomonLaterArrivalDpScenario,
  "arena-ex13-kingsukamon-machinedramon-dp": layEx13KingSukamonMachinedramonDpScenario,
  "arena-ex13-kingsukamon-vulcanusmon-link": layEx13KingSukamonVulcanusmonLinkScenario,
  "arena-ex13-examon": layEx13ExamonScenario,
  "arena-ex13-examon-battle-win-timing": layEx13ExamonBattleWinTimingScenario,
  "arena-bt23-examon-opponent-turn-dna": layBt23ExamonOpponentTurnDnaScenario,
  "arena-ex13-chirinmon-cost-choice": layEx13ChirinmonCostChoiceScenario,
  "arena-ex13-wisemon-witchelny-cost": layEx13WisemonWitchelnyCostScenario,
  "arena-ex13-flamewizardmon-optional-cost": layEx13FlameWizardmonOptionalCostScenario,
  "arena-ex5-attack-priority": layEx5AttackPriorityScenario,
  "arena-ex5-biting-crush-delay": layEx5BitingCrushDelayScenario,
  "arena-p108-training-delay-no-target": (state, decks) => layP108TrainingDelayScenario(state, decks, false),
  "arena-p108-training-delay-with-target": (state, decks) => layP108TrainingDelayScenario(state, decks, true),
  "arena-bt13-royal-purge-delay-rush": layBt13RoyalPurgeDelayRushScenario,
  "arena-p206-digital-gate-breeding-color": layP206DigitalGateBreedingColorScenario,
  "arena-ex13-merciful-mode-attack-order": layEx13MercifulModeAttackOrderScenario,
  "arena-ad1-gallantmon-deletion-attack-order": layAd1GallantmonDeletionAttackOrderScenario,
  "arena-bt20-cool-boy-stacked-omekamon": layBt20CoolBoyStackedOmekamonScenario,
  "arena-ex10-god-grade-raising-color": layEx10GodGradeRaisingColorScenario,
  "arena-ex10-malomyotismon-trash-main": layEx10MaloMyotismonTrashMainScenario,
  "arena-ex10-blastmon-digixros": layEx10BlastmonDigiXrosScenario,
  "arena-issue-4888-app-fusion": layIssue4888AppFusionScenario,
  "arena-issue-4889-weregarurumon-dna": layIssue4889WereGarurumonDnaScenario,
  "arena-paildramon-dna-inheritance": layPaildramonDnaInheritanceScenario,
  "arena-bt24-silphymon-dna": layBt24SilphymonDnaScenario,
  "arena-issue-4890-reina-deletion": layIssue4890ReinaDeletionScenario,
  "arena-issue-4891-seiten-on-play": layIssue4891SeitenOnPlayScenario,
  "arena-issue-4892-effect-digixros": layIssue4892EffectDigiXrosScenario,
  "arena-moon-pending-source-deleted": layMoonPendingSourceDeletedScenario,
  "arena-mirage-hidden-hand": layMirageHiddenHandScenario,
  "arena-kotone-digixros-pending-attack": layKotoneDigiXrosPendingAttackScenario,
  "arena-bt6-beelstarmon-duplicate-cost": layBt6BeelStarmonDuplicateCostScenario,
  "arena-bt20-saviorhuckmon-end-turn-sistermon": layBt20SaviorHuckmonEndTurnSistermonScenario,
  "arena-bt25-beelstarmon-option-trash-trigger": layBt25BeelStarmonOptionTrashTriggerScenario,
  "arena-bt20-last-guardian-omnimon-wipe": layBt20LastGuardianOmnimonWipeScenario,
  "arena-ex7-deputymon-option-trash-trigger": layEx7DeputymonOptionTrashTriggerScenario,
  "arena-bt22-leopardmon-king-drasil": layLeopardmonKingDrasilScenario,
  "arena-bt13-king-drasil-source-count": layBt13KingDrasilSourceCountScenario,
  "arena-bt13-omnimon-later-token-rush": layBt13OmnimonLaterTokenRushScenario,
  "arena-st12-blanc-rush-second-attack": laySt12BlancRushSecondAttackScenario,
  "arena-bt26-zombie-plutomon-removed-trigger": layZombiePlutomonRemovedTriggerScenario,
  "arena-bt24-hyogamon-pending-trash-digivolve": layBt24HyogamonPendingTrashDigivolveScenario,
  "arena-ex10-darkness-bagramon-digixros-interrupt": layEx10DarknessBagramonDigiXrosInterruptScenario,
  "arena-ex10-tactimon-digixros-material": layEx10TactimonDigiXrosMaterialScenario,
  "arena-hellscythe-onplay-priority": layHellscytheOnPlayPriorityScenario,
  "arena-piedmon-declined-opt": layPiedmonDeclinedOptScenario,
  "arena-vikemon-live-source-lock": layVikemonLiveSourceLockScenario,
  "arena-rizegreymon-derived-priority": (state, decks) => layDerivedPriorityScenario(state, decks, "rize"),
  "arena-trident-derived-priority": (state, decks) => layDerivedPriorityScenario(state, decks, "trident"),
  "arena-flashy-attack-priority": (state, decks) => layDerivedPriorityScenario(state, decks, "flashy"),
  "arena-dominimon-security-priority": (state, decks) => layDerivedPriorityScenario(state, decks, "dominimon"),
  "arena-issue-4893-seiten-evo-cost": layIssue4893SeitenEvoCostScenario,
  "arena-issue-4894-jesmon-token-limit": layIssue4894JesmonTokenLimitScenario,
  "arena-jesmon-scramble-dp-blocked": (state, decks) => layJesmonScrambleDpScenario(state, decks, false),
  "arena-jesmon-scramble-dp-allowed": (state, decks) => layJesmonScrambleDpScenario(state, decks, true),
  "arena-ex11-ryutaro-suspended": layEx11RyutaroSuspendedScenario,
  "arena-junomon-opponent-target": layJunomonOpponentTargetScenario,
  "arena-jupitermon-siren": layJupitermonSirenScenario,
  "arena-security-effect-pacing": laySecurityEffectPacingScenario,
  "arena-magnamon-x": layMagnamonXScenario,
  "arena-mervamon-effect-assembly": layMervamonEffectAssemblyScenario,
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
  "counter-blast-dna": layCounterBlastDnaScenario,
  "security-battle": layDelayedSecurityBattleScenario,
  "security-chain": laySecurityChainScenario,
};

export function layDevScenario(scenario: DevScenarioId, state: GameState, decks: readonly [Decklist, Decklist]): void {
  LAYOUTS[scenario](state, decks);
}
