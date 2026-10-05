import { CardInstance, Permanent, Zone, getCardDefinition, type GameState, type Seat } from "@aegis/shared";
import { loadDeckInto, setSecurityStack, type Decklist } from "./setup.js";
import { clearZone, insertCard, placePermanent, setBreeding } from "./state/access.js";

type FieldCard = { card: string; under?: string[]; suspended?: boolean };
type PlayerLayout = {
  field?: FieldCard[];
  breeding?: FieldCard;
  hand?: string[];
  trash?: string[];
  security?: string[];
  faceUpSecurity?: boolean;
};
type Layout = { players: readonly [PlayerLayout, PlayerLayout]; memory?: number };

// Reduced boards for reported issues. Each runs in the ordinary turn loop.
const ISSUE_LAYOUTS = {
  "arena-discord-1556745762682183811-giant-slayer-execute": {
    players: [
      { hand: ["BT26-085", "BT26-060"], trash: ["BT26-078"], security: ["BT1-009", "BT1-009"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 7,
  },
  "arena-discord-1556745762682183811-holy-succession": {
    players: [
      {
        hand: ["BT26-085"],
        trash: ["BT26-078", "BT26-060", "BT26-001", "BT26-009", "BT26-011", "BT26-015", "BT26-016"],
        security: ["BT1-009", "BT1-009"],
      },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 2,
  },
  "arena-discord-1556702519952932885-rosemon-burst": {
    players: [
      { field: [{ card: "BT26-049" }, { card: "BT26-091" }], hand: ["BT26-050"] },
      { field: [{ card: "BT1-009" }, { card: "BT1-010" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 3,
  },
  "arena-discord-1556702519952932885-yoshino": {
    players: [
      { field: [{ card: "BT26-091" }, { card: "ST24-09" }], hand: ["ST24-09", "ST24-10"] },
      { field: [{ card: "BT1-009" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556702668754387095-machinedramon": {
    players: [
      {
        field: [{ card: "BT12-072", under: ["EX12-054", "EX12-055", "EX12-059"] }],
        hand: ["EX12-054", "EX12-055"],
        trash: ["EX12-054"],
      },
      {
        field: [{ card: "EX12-054", under: ["BT1-009"] }],
        security: ["ST1-16", "BT1-009", "BT1-009"],
      },
    ],
  },
  "arena-discord-1556703230166175754-engage": {
    players: [
      { field: [{ card: "EX12-060" }], hand: ["BT1-009"] },
      { security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 3,
  },
  "arena-discord-1556688029731528804-jesmon": {
    players: [
      { field: [{ card: "BT23-013" }], hand: ["BT1-009"] },
      { security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556715328610762844-alphamon": {
    players: [
      { hand: ["BT13-075"], trash: ["BT9-055"] },
      { field: [{ card: "EX8-073" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556716432111304824-dantemon": {
    players: [
      {
        hand: ["BT26-086"],
        trash: ["BT26-010", "BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063", "BT26-084"],
      },
      { field: [{ card: "BT1-009" }], security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 7,
  },
  "arena-discord-1556715929973424128-block-timing": {
    players: [
      {
        field: [{ card: "EX12-076", under: ["EX12-004", "EX12-031"] }],
        hand: ["EX12-047"],
        security: ["EX12-074"],
        faceUpSecurity: true,
      },
      { field: [{ card: "BT23-077" }, { card: "BT1-009" }], security: [] },
    ],
    memory: 3,
  },

  "arena-discord-1556732255148179569-drasil-turn": {
    players: [
      {
        breeding: { card: "BT13-007", under: ["BT20-102"] },
        field: [{ card: "EX11-053", under: ["EX12-053"] }],
        hand: ["BT13-087", "EX5-048"],
        security: ["BT1-009"],
      },
      { breeding: { card: "BT1-001" }, field: [{ card: "ST1-10" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },

  "arena-issue-4938-ruli-optional-reduction": {
    players: [{ field: [{ card: "RB1-034" }, { card: "RB1-022" }], hand: ["RB1-024"] }, {}],
    memory: 5,
  },
  "arena-issue-4937-grademon-dual-immunity": {
    players: [
      { field: [{ card: "EX13-055", under: ["BT20-051"] }], hand: ["EX13-057", "BT1-082"] },
      { field: [{ card: "BT6-082" }], hand: ["EX13-065", "EX13-066"], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4937-bt20-grademon-dual-immunity": {
    players: [
      { field: [{ card: "EX13-055", under: ["BT20-051"] }], hand: ["BT20-053", "BT1-082"] },
      { field: [{ card: "BT6-082" }], hand: ["EX13-065", "EX13-066"], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4936-examon-repeat-barrier": {
    players: [
      { field: [{ card: "BT1-080" }, { card: "ST2-10" }], hand: ["EX13-045"] },
      {
        field: [{ card: "EX13-060", under: ["EX13-055"], suspended: true }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    ],
  },
  "arena-issue-4935-blanc-arts-guard": {
    players: [
      { field: [{ card: "BT23-076" }, { card: "BT1-080" }], hand: ["EX13-065"] },
      { field: [{ card: "BT1-024" }], hand: ["ST1-16"] },
    ],
  },
  "arena-issue-4933-lilamon-host": {
    players: [
      { field: [{ card: "BT1-009" }], hand: ["BT6-095"] },
      {
        field: [{ card: "ST24-11", under: ["ST24-10"] }, { card: "ST24-03" }, { card: "ST24-13", under: ["BT1-001"] }],
      },
    ],
  },
  "arena-issue-4932-kentaurosmon-security": {
    players: [
      { field: [{ card: "ST24-10" }], hand: ["EX13-036"], security: ["BT1-009", "BT1-010", "BT1-011"] },
      { field: [{ card: "BT1-024" }, { card: "BT1-024" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4931-lordknightmon-reduction": { players: [{ field: [{ card: "BT5-042" }], hand: ["AD1-018"] }, {}] },
  "arena-issue-4930-venusmon-opponent-cost": {
    players: [
      { field: [{ card: "BT6-007" }], hand: ["BT6-095"] },
      { field: [{ card: "BT24-040", under: ["BT24-033"] }, { card: "BT24-034" }] },
    ],
  },
  "arena-issue-4929-noir-single-target": {
    players: [
      { field: [{ card: "BT6-082" }, { card: "ST12-12" }, { card: "BT6-084" }], hand: ["EX13-066"] },
      {
        field: [
          { card: "BT1-080", under: ["BT7-083", "BT7-082", "BT1-013"] },
          { card: "BT1-080", under: ["BT7-083", "BT7-082", "BT1-013"] },
        ],
      },
    ],
  },
  "arena-issue-4926-battle-priority": {
    players: [
      { field: [{ card: "BT23-047", under: ["EX13-041"] }] },
      {
        field: [
          { card: "BT5-042", suspended: true },
          { card: "EX13-074", suspended: true },
        ],
        hand: ["EX13-058"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    ],
  },
  "arena-issue-4924-revelation-security-faces": {
    players: [{ field: [{ card: "BT1-045" }], hand: ["BT15-092"], security: ["BT15-033", "BT15-033", "BT1-009"] }, {}],
  },
  "arena-issue-4923-seiten-assembly": {
    players: [{ hand: ["EX12-048"], trash: ["EX12-015", "EX12-029", "BT12-041"] }, {}],
  },
  "arena-issue-4921-homeros-late-arrival": {
    players: [{ field: [{ card: "BT26-029" }, { card: "BT26-090" }], hand: ["BT26-033", "BT24-102"] }, {}],
  },
  "arena-issue-4919-seventh-lightning-cost": {
    players: [
      { field: [{ card: "BT15-077" }], hand: ["BT15-081"], trash: ["BT15-100"] },
      { field: [{ card: "BT15-079" }] },
    ],
  },
  "arena-issue-4918-lordknightmon-player-attack": {
    players: [
      { field: [{ card: "EX13-074", under: ["EX13-058", "EX13-058", "EX13-058"] }], hand: ["BT22-067"] },
      { field: [{ card: "BT1-009", suspended: true }] },
    ],
  },
  "arena-issue-4917-biting-crush-placement": {
    players: [{ field: [{ card: "BT2-067" }], hand: ["EX5-069", "EX5-063"] }, {}],
  },
  "arena-issue-4916-raid-target-block": { players: [{ field: [{ card: "AD1-008" }] }, { hand: ["EX13-062"] }] },
  "arena-issue-4915-junomon-homeros": {
    players: [
      { field: [{ card: "BT1-024" }] },
      { field: [{ card: "BT25-044" }], hand: ["BT24-102"], security: ["BT1-009"] },
    ],
  },
  "arena-issue-4913-cool-boy-proto-form": {
    players: [{ field: [{ card: "EX8-026" }, { card: "BT9-092" }], hand: ["EX5-070", "BT20-028"] }, {}],
  },
  "arena-issue-4912-deep-savers-battle": {
    players: [
      { field: [{ card: "EX13-024" }], hand: ["EX13-045"] },
      { field: [{ card: "EX8-026", suspended: true }], security: ["EX8-068"], faceUpSecurity: true },
    ],
    memory: 4,
  },
  "arena-issue-4911-mervamon-multiple-checks": {
    players: [
      {
        field: [
          { card: "BT26-081" },
          { card: "BT26-081" },
          { card: "BT26-029" },
          { card: "BT26-029" },
          { card: "BT26-029" },
          { card: "BT26-029" },
        ],
      },
      { security: ["BT1-009", "BT1-010", "BT1-011", "BT1-009", "BT1-010", "BT1-011", "BT1-009", "BT1-010"] },
    ],
  },
  "arena-issue-4907-takato-end-turn": {
    players: [
      {
        field: [{ card: "BT17-080" }, { card: "EX13-015", under: ["AD1-003", "EX13-007"] }],
        hand: ["BT17-016"],
        trash: ["BT17-010", "BT17-013", "EX13-007"],
      },
      { field: [{ card: "BT13-103" }, { card: "BT13-088" }], hand: ["BT1-009"] },
    ],
  },
} satisfies Record<string, Layout>;

export type IssueReproScenarioId = keyof typeof ISSUE_LAYOUTS;
export const ISSUE_REPRO_SCENARIO_IDS = Object.keys(ISSUE_LAYOUTS) as IssueReproScenarioId[];

export function layIssueReproScenario(
  id: IssueReproScenarioId,
  state: GameState,
  decks: readonly [Decklist, Decklist],
): void {
  const layout: Layout = ISSUE_LAYOUTS[id];
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
    clearZone(player, Zone.Hand);
    clearZone(player, Zone.Trash);
    player.battleArea.clear();
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
    for (const [index, field] of (spec.field ?? []).entries()) {
      const permanent = new Permanent();
      permanent.permanentId = `${id}-${seat}-field-${index}`;
      permanent.controllerSeat = seat;
      permanent.topCard = card(field.card, seat, "field", index, true);
      permanent.enterFieldTurnCount = -1;
      permanent.isSuspended = field.suspended === true;
      permanent.baseDP = getCardDefinition(field.card)?.dp ?? 0;
      permanent.currentDP = permanent.baseDP;
      for (const [sourceIndex, cardId] of (field.under ?? []).entries())
        permanent.stack.push(card(cardId, seat, `source-${index}`, sourceIndex, true));
      placePermanent(player, permanent);
    }
    if (spec.breeding !== undefined) {
      const permanent = new Permanent();
      permanent.permanentId = `${id}-${seat}-breeding`;
      permanent.controllerSeat = seat;
      permanent.topCard = card(spec.breeding.card, seat, "breeding", 0, true);
      permanent.inBreeding = true;
      for (const [index, cardId] of (spec.breeding.under ?? []).entries())
        permanent.stack.push(card(cardId, seat, "breeding-source", index, true));
      setBreeding(player, permanent);
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = layout.memory ?? 10;
}
