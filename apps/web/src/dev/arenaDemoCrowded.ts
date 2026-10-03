import { CardInstance, GameState, Permanent, Phase, PlayerState, getCardDefinition, type Seat } from "@aegis/shared";

type CrowdedPiece = {
  cardId: string;
  sources?: readonly string[];
  linked?: readonly string[];
  suspended?: boolean;
  activatable?: boolean;
};

/* Play order on purpose: Tamers, Options and Digimon interleave, with copies far apart,
   the way a long game leaves the field. The organized layout should sort and group it. */
const CROWDED_FIELDS: Record<Seat, readonly CrowdedPiece[]> = {
  0: [
    { cardId: "BT22-093", activatable: true },
    { cardId: "BT22-101" },
    {
      cardId: "BT25-075",
      sources: [
        "BT1-010",
        "BT1-010",
        "BT1-010",
        "ST1-07",
        "ST1-07",
        "ST1-07",
        "BT1-074",
        "BT1-074",
        "BT1-074",
        "BT1-077",
        "BT1-077",
        "BT1-077",
      ],
      linked: ["BT25-101", "BT25-100"],
    },
    { cardId: "BT22-099" },
    { cardId: "BT22-091", suspended: true },
    { cardId: "BT22-083" },
    { cardId: "BT22-093", activatable: true },
    { cardId: "BT1-067", sources: ["BT1-010"] },
    { cardId: "BT22-099" },
    { cardId: "BT20-045", sources: ["BT22-063", "BT22-056"] },
    { cardId: "BT22-093", activatable: true },
    { cardId: "BT2-061" },
    { cardId: "BT22-091", suspended: true },
    { cardId: "BT12-077", suspended: true },
    { cardId: "BT12-098" },
    { cardId: "BT15-061" },
  ],
  1: [
    { cardId: "BT12-008", sources: ["BT1-010"] },
    { cardId: "BT12-098" },
    { cardId: "BT11-072", sources: ["BT2-061", "BT15-061"] },
    { cardId: "BT22-083", suspended: true },
    { cardId: "BT12-098" },
    { cardId: "BT12-077" },
    { cardId: "BT17-080" },
    { cardId: "BT1-044", sources: ["BT1-010", "BT1-015"], suspended: true },
    { cardId: "BT12-098" },
  ],
};

const AMI_AIBA = "BT22-093";

/** What the demo menu did to the viewer's Tamers: how many Ami Aiba it turned, or whether it readied all of them. */
export type CrowdedTamers = { turnedAmiAiba: number; allReady: boolean };

/** A long game's board: many Digimon, repeated Tamers and Options left on the field. */
export function createArenaCrowdedDemoState(
  drawCounts: readonly [number, number],
  tamers: CrowdedTamers = { turnedAmiAiba: 0, allReady: false },
): GameState {
  const state = new GameState();
  state.matchId = "arena-crowded-demo";
  state.phase = Phase.Main;
  state.turnCount = 9;
  state.turnSeat = 0;
  state.memory = 2;
  function card(cardId: string, instanceId: string, seat: Seat) {
    const result = new CardInstance();
    result.cardId = cardId;
    result.instanceId = instanceId;
    result.ownerSeat = seat;
    return result;
  }
  function permanent(piece: CrowdedPiece, id: string, seat: Seat) {
    const result = new Permanent();
    result.permanentId = id;
    result.controllerSeat = seat;
    result.topCard = card(piece.cardId, `${id}-top`, seat);
    result.stack.push(...(piece.sources ?? []).map((source, index) => card(source, `${id}-source-${index}`, seat)));
    result.linked.push(...(piece.linked ?? []).map((source, index) => card(source, `${id}-link-${index}`, seat)));
    result.baseDP = getCardDefinition(piece.cardId)?.dp ?? 0;
    result.currentDP = result.baseDP;
    result.isSuspended = piece.suspended ?? false;
    result.activatableEffectsJson = piece.activatable
      ? JSON.stringify([
          { instanceId: result.topCard.instanceId, effectKey: `${piece.cardId}/0`, description: "[Main] Draw 1" },
        ])
      : "";
    return result;
  }
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `arena-demo-${seat}`;
    player.displayName = seat === 0 ? "Ami Aiba" : "Machinedramon";
    player.avatarId = seat === 0 ? "herculeskabuterimon" : "piximon";
    player.securityCount = seat === 0 ? 3 : 2;
    player.eggDeckCount = 2;
    player.deckCount = Math.max(0, 22 - drawCounts[seat]);
    player.battleArea.push(
      ...CROWDED_FIELDS[seat].map((piece, index) => permanent(piece, `${seat}-field-${index}`, seat)),
    );
    if (seat === 0) {
      const amiAiba = player.battleArea.filter((placed) => placed.topCard.cardId === AMI_AIBA);
      for (const turned of amiAiba.slice(0, tamers.turnedAmiAiba)) {
        turned.isSuspended = true;
        turned.activatableEffectsJson = "";
      }
      if (tamers.allReady) {
        for (const placed of player.battleArea) {
          if (!placed.stack.length) placed.isSuspended = false;
        }
      }
    }
    const hand = ["BT22-056", "BT26-054", "BT13-059", "BT22-093", "BT12-089"];
    if (seat === 0) player.hand.push(...hand.map((cardId, index) => card(cardId, `hand-${index}`, seat)));
    player.handCount = (seat === 0 ? hand.length : 4) + drawCounts[seat];
    state.players.push(player);
  }
  return state;
}
