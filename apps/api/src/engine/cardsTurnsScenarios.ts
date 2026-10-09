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
  field?: FieldCard[];
  breeding?: FieldCard;
  hand?: string[];
  trash?: string[];
  security?: string[];
  faceUpSecurity?: boolean;
};
type Layout = { players: readonly [PlayerLayout, PlayerLayout]; memory?: number };

const CARD_TURN_LAYOUTS = {
  "arena-github-5373-targetmon-assembly": {
    players: [{ hand: ["EX13-031"], trash: ["EX13-028", "EX13-028", "EX5-046"] }, {}],
  },
  "arena-github-5376-patamon-angemon": {
    players: [{ field: [{ card: "BT14-033" }], security: ["BT23-027", "BT25-034", "BT1-009"], hand: ["BT14-035"] }, {}],
  },
  "arena-github-5402-dedigi-main": {
    players: [
      {
        field: [{ card: "EX13-018", under: ["BT21-046"] }, { card: "BT8-088" }, { card: "BT1-068" }],
        hand: ["EX13-018"],
      },
      { hand: ["BT5-105"], field: [{ card: "EX1-052" }] },
    ],
  },
  "arena-github-5404-knightmon-aura": {
    players: [
      { field: [{ card: "EX13-058" }, { card: "BT19-063", suspended: true }, { card: "BT1-009", suspended: true }] },
      {},
    ],
  },
  "arena-github-5405-material-save": {
    players: [
      { field: [{ card: "BT19-063", under: ["BT7-058", "BT7-059"] }, { card: "BT2-089" }] },
      { field: [{ card: "BT1-084", suspended: true }] },
    ],
  },
  "arena-github-5406-craniamon-suspend": {
    players: [
      { field: [{ card: "EX13-062" }] },
      { field: [{ card: "BT1-009" }, { card: "BT1-009" }, { card: "BT1-084" }] },
    ],
  },
  "arena-github-5407-kakkinmon-opponent-end": {
    players: [
      { field: [{ card: "EX13-062", under: ["P-245"] }] },
      { field: [{ card: "BT1-009" }, { card: "BT1-009" }, { card: "BT1-084" }] },
    ],
  },
  "arena-github-5414-kakkinmon-opponent-end": {
    players: [
      { field: [{ card: "EX13-062", under: ["P-245"] }] },
      { field: [{ card: "BT1-009" }, { card: "BT1-009" }, { card: "BT1-084" }] },
    ],
  },
  "arena-github-5413-psychemon-assembly": {
    players: [{ hand: ["EX13-031"], trash: ["EX13-028", "EX13-028", "EX5-046"] }, { field: [{ card: "BT8-071" }] }],
  },
  "arena-github-5413-psychemon-digixros": {
    players: [{ hand: ["BT19-063", "BT7-058", "BT7-059"] }, { field: [{ card: "BT8-071" }] }],
  },
  "arena-github-5415-egg-breeding": { players: [{ breeding: { card: "EX13-005" }, hand: ["BT21-046"] }, {}] },
} satisfies Record<string, Layout>;

export type CardsTurnsScenarioId = keyof typeof CARD_TURN_LAYOUTS;
export const CARDS_TURNS_SCENARIO_IDS = Object.keys(CARD_TURN_LAYOUTS) as CardsTurnsScenarioId[];

export function layCardsTurnsScenario(
  id: CardsTurnsScenarioId,
  state: GameState,
  decks: readonly [Decklist, Decklist],
): void {
  const layout: Layout = CARD_TURN_LAYOUTS[id];
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
    clearZone(player, Zone.Security);
    for (let index = 0; index < 5; index++)
      insertCard(player, Zone.Security, card("BT1-001", seat, "security", index, false));
    const spec = layout.players[seat];
    if (spec.deck === undefined) {
      clearZone(player, Zone.Deck);
      for (let index = 0; index < 12; index++)
        insertCard(player, Zone.Deck, card("BT1-009", seat, "deck", index, false));
    }
    if (spec.deck !== undefined) {
      clearZone(player, Zone.Deck);
      for (const [index, cardId] of spec.deck.entries())
        insertCard(player, Zone.Deck, card(cardId, seat, "deck", index, false));
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
