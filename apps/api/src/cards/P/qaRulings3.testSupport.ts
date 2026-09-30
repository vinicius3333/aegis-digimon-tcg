import { CARD_ID_VIEW_TAG, type Seat } from "@aegis/shared";
import { Encoder } from "@colyseus/schema";
import { expect } from "vitest";
import { buildStateView } from "../../engine/state/visibility.js";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";

/**
 * Seat 0 plays `cardId` from hand over a deck whose top cards are `deck`, declining every
 * optional prompt so only mandatory additions happen. Returns the setup once the [On Play]
 * reveal has resolved.
 */
export async function playRevealing(cardId: string, deck: string[]): Promise<EngineSetup> {
  const s = setupEngine(
    { 0: { hand: [{ card: cardId, as: "revealer" }], deck: deck.map((card, index) => ({ card, as: `deck${index}` })) } },
    { autoDeclineOptional: true, autoSelectCards: true, autoOrderCards: true, declineDigiXros: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revealer").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.battleArea.length > 0 && s.state.pendingDecision === undefined);
  await settle(() => s.state.pendingDecision === undefined);
  return s;
}

export function handCardIds(s: EngineSetup): string[] {
  return s.state.players[0]!.hand.map(({ cardId }) => cardId).sort();
}

export function selectionFloors(s: EngineSetup): (number | undefined)[] {
  return s.decisions.filter(({ req }) => req.kind === "selectCards").map(({ req }) => req.options?.min);
}

/**
 * Seat 1 holds BT16-101 Rapidmon (X Antibody) over a [Rapidmon], so every suspended Digimon
 * of seat 0 gets -4000 DP. Seat 0's breeding area holds a suspended 3000 DP Digimon beside
 * `watchers` in its battle area; moving it out of breeding puts it into play at 0 DP.
 */
export function suspendedBreedingUnderRapidmon(watchers: string[]): EngineSetup {
  const s = setupEngine(
    {
      0: {
        battleArea: watchers.map((card) => ({ card, as: card })),
        breeding: { card: "BT1-009", as: "raised", suspended: true },
        eggDeck: [{ card: "BT1-001", as: "egg" }],
      },
      1: { battleArea: [{ card: "BT16-101", as: "rapidmon", under: ["BT3-052"] }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 0;
  return s;
}

export async function moveRaisedOutOfBreeding(s: EngineSetup): Promise<void> {
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("raised").permanentId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("raised").instanceId));
  await settle(() => s.state.pendingDecision === undefined);
}

export interface TrashReturnVisibility {
  /** Per offered trash card: the seats whose projected state can read its identity. */
  readersAtSelection: Map<string, Seat[]>;
  /** The card ids named by the broadcast move to the deck bottom. */
  announcedCardIds: string[];
  returnedInstanceIds: string[];
}

/**
 * Answers seat 0's open trash-card selection with every offered card, after recording which
 * seats' state projections can read each offered card. Needs `autoSelectCards` off so the
 * selection stays open for inspection.
 */
export async function returnOfferedTrashCardsWatchingViews(s: EngineSetup): Promise<TrashReturnVisibility> {
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const request = s.decisions.at(-1)!.req;
  const offered = request.options?.candidateInstanceIds ?? [];
  const trash = s.state.players[0]!.trash;
  // eslint-disable-next-line no-new -- constructing the Encoder wires the schema root so per-seat views can be built.
  new Encoder(s.state);
  const views = ([0, 1] as const).map((seat) => ({ seat, view: buildStateView(s.state, seat) }));
  const readersAtSelection = new Map(
    offered.map((instanceId) => {
      const card = trash.find((candidate) => candidate.instanceId === instanceId)!;
      return [instanceId, views.filter(({ view }) => view.hasTag(card, CARD_ID_VIEW_TAG)).map(({ seat }) => seat)];
    }),
  );
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "selectCards", instanceIds: offered.slice(0, request.options?.max ?? offered.length) },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "cardsMoved" && event.to === "deckBottom"));
  await settle(() => s.state.pendingDecision === undefined);
  const returned = s.events.find((event) => event.kind === "cardsMoved" && event.to === "deckBottom") as Extract<
    EngineSetup["events"][number],
    { kind: "cardsMoved" }
  >;
  return {
    readersAtSelection,
    announcedCardIds: [...(returned.cardIds ?? [])],
    returnedInstanceIds: [...(returned.instanceIds ?? [])],
  };
}

/**
 * Seat 1 holds EX13-035 KingEtemon beside a [Sukamon] and an [Etemon], so its [All Turns]
 * effect gives every Digimon of seat 0 -3000 DP and ＜Security A. -1＞. Seat 0's breeding area
 * holds a 3000 DP Digimon beside `watchers` in its battle area; moving it out of breeding puts
 * it into play at 0 DP.
 */
export function breedingUnderKingEtemon(watchers: PermanentSpec[], securityCount = 0): EngineSetup {
  const s = setupEngine(
    {
      0: {
        battleArea: watchers,
        breeding: { card: "BT1-009", as: "raised" },
        eggDeck: [{ card: "BT1-001", as: "egg" }],
        security: securityCount,
      },
      1: {
        battleArea: [
          { card: "EX13-035", as: "kingEtemon" },
          { card: "BT3-063", as: "sukamon" },
          { card: "BT3-070", as: "etemon" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 0;
  return s;
}
