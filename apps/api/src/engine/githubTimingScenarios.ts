import { CardKind, CardInstance, Permanent, Zone, getCardDefinition, type GameState, type Seat } from "@aegis/shared";
import { loadDeckInto, setSecurityStack, type Decklist } from "./setup.js";
import {
  clearBattleArea,
  clearZone,
  insertCard,
  linkCard,
  placePermanent,
  pushOnStack,
  setBreeding,
  setTopCard,
} from "./state/access.js";

type FieldCard = { card: string; under?: string[]; linked?: string[]; faceDownUnder?: boolean; suspended?: boolean };
type PlayerLayout = {
  deck?: string[];
  eggDeck?: string[];
  field?: FieldCard[];
  breeding?: FieldCard;
  hand?: string[];
  trash?: string[];
  security?: string[];
  faceUpSecurity?: boolean;
};
type Layout = { players: readonly [PlayerLayout, PlayerLayout]; memory?: number };

const TIMING_LAYOUTS = {
  "arena-github5399-cerberus-first-option": {
    memory: 10,
    players: [
      {
        field: [{ card: "BT26-069" }],
        hand: ["BT26-074", "BT26-100"],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
        security: ["BT1-010"],
      },
      {},
    ],
  },
  "arena-github5400-dark-field-replacement": {
    memory: 5,
    players: [{ field: [{ card: "BT26-074" }], hand: ["BT26-100"], security: ["BT26-100"], faceUpSecurity: true }, {}],
  },
  "arena-github5403-rie-any-card": {
    memory: 8,
    players: [
      {
        field: [{ card: "EX13-074" }],
        hand: ["ST13-12"],
        trash: ["BT22-090", "BT18-099", "BT1-009"],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
      {},
    ],
  },
  "arena-github5411-savior-empty-hand-selection": {
    memory: 5,
    players: [
      {
        field: [{ card: "BT20-014" }, { card: "BT1-009" }],
        hand: ["BT6-016"],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      {},
    ],
  },
  "arena-github5418-zeig-shoutmon-evolution": {
    memory: 10,
    players: [
      {
        field: [{ card: "BT11-031", under: ["BT10-019", "BT10-024"] }],
        hand: ["AD1-006"],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      {},
    ],
  },
  "arena-github5419-dark-masters-security": {
    memory: 10,
    players: [
      { field: [{ card: "EX10-020" }, { card: "EX10-035" }], security: ["EX10-057"], faceUpSecurity: true },
      { security: ["EX13-035", "EX13-035"] },
    ],
  },
  "arena-github5419-kongou-prevention": {
    memory: 10,
    players: [
      {
        field: [{ card: "BT1-009" }, { card: "EX10-020" }, { card: "EX10-035" }],
        security: ["EX10-057"],
        faceUpSecurity: true,
      },
      { security: ["BT9-103", "EX13-035", "EX13-035"] },
    ],
  },
  "arena-github5420-metalgaruru-gallantmon": {
    memory: 10,
    players: [
      { field: [{ card: "EX12-032", under: ["BT1-009"] }], hand: ["EX12-035"] },
      { field: [{ card: "EX13-015", under: ["EX13-001", "EX2-008", "EX13-010", "EX8-012", "EX13-013"] }] },
    ],
  },
  "arena-github5420-omnimon-gallantmon": {
    memory: 10,
    players: [
      {
        field: [{ card: "EX12-035", under: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] }],
        hand: ["AD1-025"],
      },
      { field: [{ card: "EX13-015", under: ["EX13-001", "EX2-008", "EX13-010", "EX8-012", "EX13-013"] }] },
    ],
  },
  "arena-github5421-skullmammoth-hand": {
    memory: 10,
    players: [{ hand: ["BT14-072", "BT1-009", "ST16-13"], trash: ["BT10-074"] }, {}],
  },
  "arena-github5421-skullmammoth-field": {
    memory: 10,
    players: [{ field: [{ card: "ST16-13" }], hand: ["BT14-072", "BT1-009"], trash: ["BT10-074"] }, {}],
  },
} satisfies Record<string, Layout>;

export type GithubTimingScenarioId = keyof typeof TIMING_LAYOUTS;
export const GITHUB_TIMING_SCENARIO_IDS = Object.keys(TIMING_LAYOUTS) as GithubTimingScenarioId[];

export function layGithubTimingScenario(
  id: GithubTimingScenarioId,
  state: GameState,
  decks: readonly [Decklist, Decklist],
): void {
  const layout: Layout = TIMING_LAYOUTS[id];
  function card(cardId: string, seat: Seat, zone: string, index: number, faceUp: boolean): CardInstance {
    const instance = new CardInstance();
    instance.instanceId = `${id}-${seat}-${zone}-${index}`;
    instance.cardId = cardId;
    instance.ownerSeat = seat;
    instance.faceUp = faceUp;
    return instance;
  }
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    setSecurityStack(player);
    const spec = layout.players[seat];
    if (spec.deck !== undefined) {
      clearZone(player, Zone.Deck);
      for (const [index, cardId] of spec.deck.entries())
        insertCard(player, Zone.Deck, card(cardId, seat, "deck", index, false));
    }
    if (spec.eggDeck !== undefined) {
      clearZone(player, Zone.EggDeck);
      for (const [index, cardId] of spec.eggDeck.entries())
        insertCard(player, Zone.EggDeck, card(cardId, seat, "egg", index, false));
    }
    clearZone(player, Zone.Hand);
    clearZone(player, Zone.Trash);
    clearBattleArea(player);
    setBreeding(player, undefined);
    for (const [index, cardId] of (spec.hand ?? []).entries())
      insertCard(player, Zone.Hand, card(cardId, seat, "hand", index, false));
    for (const [index, cardId] of (spec.trash ?? []).entries())
      insertCard(player, Zone.Trash, card(cardId, seat, "trash", index, true));
    if (spec.security !== undefined) {
      clearZone(player, Zone.Security);
      for (const [index, cardId] of spec.security.entries())
        insertCard(player, Zone.Security, card(cardId, seat, "security", index, spec.faceUpSecurity === true));
    }
    for (const [index, field] of [...(spec.field ?? []), ...(spec.breeding ? [spec.breeding] : [])].entries()) {
      const permanent = new Permanent();
      permanent.permanentId = `${id}-${seat}-field-${index}`;
      permanent.controllerSeat = seat;
      setTopCard(permanent, card(field.card, seat, "field", index, true));
      permanent.enterFieldTurnCount = -1;
      permanent.isSuspended = field.suspended === true;
      permanent.baseDP = getCardDefinition(field.card)?.dp ?? 0;
      permanent.currentDP = permanent.baseDP;
      permanent.placedByEffect = getCardDefinition(field.card)?.kinds.includes(CardKind.Option) === true;
      for (const [sourceIndex, cardId] of (field.under ?? []).entries())
        pushOnStack(permanent, card(cardId, seat, `source-${index}`, sourceIndex, field.faceDownUnder !== true));
      for (const [linkIndex, cardId] of (field.linked ?? []).entries())
        linkCard(permanent, card(cardId, seat, `linked-${index}`, linkIndex, true), "bottom");
      if (field === spec.breeding) {
        permanent.inBreeding = true;
        setBreeding(player, permanent);
      } else placePermanent(player, permanent);
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = layout.memory ?? 10;
}
