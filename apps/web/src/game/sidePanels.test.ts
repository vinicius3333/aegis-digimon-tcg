import { describe, expect, it } from "vitest";
import { DECK_BOTTOM, type Seat, type ServerEvent } from "@aegis/shared";
import {
  attackAnnouncementFromEvent,
  dismissSidePanel,
  expireSidePanels,
  MAX_VISIBLE_SIDE_PANELS,
  nextSidePanelExpiry,
  pushSidePanel,
  sidePanelColumn,
  sidePanelFromEvent,
  sidePanelRemaining,
  SIDE_PANEL_LIFETIME_MS,
  titleForMovement,
  type SidePanel,
  type SidePanelLookup,
} from "./sidePanels";

const VIEWER: Seat = 0;

function lookup(cards: Record<string, string>, seats: Record<string, Seat>): SidePanelLookup {
  return { cardId: (id) => cards[id], seat: (id) => seats[id] };
}

function panel(overrides: Partial<SidePanel> = {}): SidePanel {
  return {
    id: "p1",
    titleKey: "panel.discardedCards",
    side: "you",
    cards: [{ cardId: "BT1-001", badge: 1 }],
    ordered: false,
    createdAt: 0,
    ...overrides,
  };
}

describe("titleForMovement", () => {
  it("names a trash movement by where the cards came from", () => {
    expect(titleForMovement("hand", "trash")).toBe("panel.discardedCards");
    expect(titleForMovement("battleArea", "trash")).toBe("panel.deletedCards");
    expect(titleForMovement("breeding", "trash")).toBe("panel.deletedCards");
    expect(titleForMovement("various", "trash")).toBe("panel.trashedCards");
  });

  it("names the other destinations the reference client titles", () => {
    expect(titleForMovement("deck", "hand")).toBe("panel.cardsAddedToHand");
    expect(titleForMovement("hand", "deckBottom")).toBe("panel.deckBottomCard");
    expect(titleForMovement("hand", "deck")).toBe("panel.deckCards");
    expect(titleForMovement("deck", "selected")).toBe("panel.selectedCards");
    expect(titleForMovement("hand", "stackBottom")).toBe("panel.digivolutionCards");
  });

  it("uses the exact destination the server emits for a deck-bottom return", () => {
    // Pinned to the shared constant so renaming it on the server fails here, not in the UI.
    expect(titleForMovement("various", DECK_BOTTOM)).toBe("panel.deckBottomCard");
  });

  it("stays silent about movements the board already shows", () => {
    expect(titleForMovement("hand", "battleArea")).toBeNull();
    expect(titleForMovement("suspended", "unsuspended")).toBeNull();
  });
});

describe("sidePanelFromEvent", () => {
  it("opens a discard panel for cards leaving the hand for the trash", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["a", "b"], from: "hand", to: "trash" };
    const result = sidePanelFromEvent(event, VIEWER, lookup({ a: "BT1-001", b: "BT1-002" }, { a: 0, b: 0 }), "id", 100);
    expect(result).toEqual({
      id: "id",
      titleKey: "panel.discardedCards",
      side: "you",
      cards: [
        { cardId: "BT1-001", badge: 1 },
        { cardId: "BT1-002", badge: 2 },
      ],
      ordered: true,
      createdAt: 100,
    });
  });

  it("opens a deletion panel for cards leaving the battle area, on the owner's side", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["a"], from: "battleArea", to: "trash" };
    const result = sidePanelFromEvent(event, VIEWER, lookup({ a: "BT1-010" }, { a: 1 }), "id", 0);
    expect(result?.titleKey).toBe("panel.deletedCards");
    expect(result?.side).toBe("opp");
  });

  it("opens a hand panel for an effect that added cards to a hand", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["a"], from: "deck", to: "hand" };
    expect(sidePanelFromEvent(event, VIEWER, lookup({ a: "BT1-010" }, { a: 0 }), "id", 0)?.titleKey).toBe(
      "panel.cardsAddedToHand",
    );
  });

  it("ignores movements the board already shows", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["a"], from: "hand", to: "battleArea" };
    expect(sidePanelFromEvent(event, VIEWER, lookup({ a: "BT1-010" }, { a: 0 }), "id", 0)).toBeNull();
  });

  it("skips a movement whose cards cannot be identified yet", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["a"], from: "hand", to: "trash" };
    expect(sidePanelFromEvent(event, VIEWER, lookup({}, {}), "id", 0)).toBeNull();
  });

  it("skips a movement with no resolvable owner", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["a"], from: "hand", to: "trash" };
    expect(sidePanelFromEvent(event, VIEWER, lookup({ a: "BT1-010" }, {}), "id", 0)).toBeNull();
  });

  it("names the cards from the event itself before the board index has caught up", () => {
    const event: ServerEvent = {
      kind: "cardsMoved",
      instanceIds: ["a", "b"],
      from: "security",
      to: "trash",
      cardIds: ["BT1-010", "BT1-095"],
      seat: 1,
    };
    const result = sidePanelFromEvent(event, VIEWER, lookup({}, {}), "id", 0);
    expect(result?.titleKey).toBe("panel.trashedCards");
    expect(result?.side).toBe("opp");
    expect(result?.cards).toEqual([
      { cardId: "BT1-010", badge: 1 },
      { cardId: "BT1-095", badge: 2 },
    ]);
  });

  it("numbers a reveal from its first card, because reveal order is the point", () => {
    const theirs: ServerEvent = { kind: "cardRevealed", seat: 1, cardId: "BT1-021" };
    const result = sidePanelFromEvent(theirs, VIEWER, lookup({}, {}), "b", 0);
    expect(result?.titleKey).toBe("panel.revealedCards");
    expect(result?.side).toBe("opp");
    expect(result?.ordered).toBe(true);
  });

  it("skips a reveal by the viewer, because a reveal informs the other player", () => {
    const mine: ServerEvent = { kind: "cardRevealed", seat: 0, cardId: "BT1-021" };
    expect(sidePanelFromEvent(mine, VIEWER, lookup({}, {}), "b", 0)).toBeNull();
  });

  it("leaves a played card to the centre-screen showcase, for either seat", () => {
    const mine: ServerEvent = { kind: "cardPlayed", seat: 0, cardId: "BT1-030" };
    const theirs: ServerEvent = { kind: "cardPlayed", seat: 1, cardId: "BT1-031" };
    expect(sidePanelFromEvent(mine, VIEWER, lookup({}, {}), "a", 0, true)).toBeNull();
    expect(sidePanelFromEvent(theirs, VIEWER, lookup({}, {}), "b", 0, true)).toBeNull();
  });

  it("announces the opponent's play when the showcase cannot play it", () => {
    const theirs: ServerEvent = { kind: "cardPlayed", seat: 1, cardId: "BT1-031" };
    const result = sidePanelFromEvent(theirs, VIEWER, lookup({}, {}), "b", 0, false);
    expect(result?.titleKey).toBe("panel.playedCard");
    expect(result?.side).toBe("opp");
    expect(result?.cards).toEqual([{ cardId: "BT1-031", badge: 1 }]);
  });

  it("still leaves the viewer's own play unannounced without a showcase", () => {
    const mine: ServerEvent = { kind: "cardPlayed", seat: 0, cardId: "BT1-030" };
    expect(sidePanelFromEvent(mine, VIEWER, lookup({}, {}), "a", 0, false)).toBeNull();
  });

  it("announces only the opponent's digivolution", () => {
    const mine: ServerEvent = { kind: "digivolved", seat: 0, permanentId: "p", cardId: "BT1-040", mechanic: "normal" };
    const theirs: ServerEvent = {
      kind: "digivolved",
      seat: 1,
      permanentId: "p",
      cardId: "BT1-041",
      mechanic: "normal",
    };
    expect(sidePanelFromEvent(mine, VIEWER, lookup({}, {}), "a", 0)).toBeNull();
    expect(sidePanelFromEvent(theirs, VIEWER, lookup({}, {}), "b", 0)?.titleKey).toBe("panel.digivolutionCards");
  });

  it("leaves the opponent's breeding digivolution to the centre-screen showcase", () => {
    const theirs: ServerEvent = {
      kind: "digivolved",
      seat: 1,
      permanentId: "p",
      cardId: "BT1-041",
      mechanic: "normal",
      inBreeding: true,
    };
    expect(sidePanelFromEvent(theirs, VIEWER, lookup({}, {}), "b", 0, true)).toBeNull();
    expect(sidePanelFromEvent(theirs, VIEWER, lookup({}, {}), "b", 0, false)?.titleKey).toBe("panel.digivolutionCards");
  });
});

describe("attackAnnouncementFromEvent", () => {
  const attack = (seat: Seat): ServerEvent => ({
    kind: "attackDeclared",
    seat,
    attackerPermanentId: "p1",
    attackerCardId: "BT1-040",
    target: { kind: "player" },
  });

  it("announces an attack from either seat with the attacker's card", () => {
    expect(attackAnnouncementFromEvent(attack(0), VIEWER, "a", 5)).toEqual({
      id: "a",
      cardId: "BT1-040",
      side: "you",
      createdAt: 5,
    });
    expect(attackAnnouncementFromEvent(attack(1), VIEWER, "b", 5)?.side).toBe("opp");
  });

  it("ignores other events", () => {
    expect(
      attackAnnouncementFromEvent({ kind: "turnEnded", endingSeat: 0, nextSeat: 1, turnCount: 2 }, VIEWER, "a", 0),
    ).toBeNull();
  });
});

describe("pushSidePanel", () => {
  it("merges a follow-up into a fresh panel of the same title and side, renumbering the badges", () => {
    const first = panel({ id: "a", createdAt: 0 });
    const second = panel({ id: "b", createdAt: 500, cards: [{ cardId: "BT1-002", badge: 1 }] });
    const result = pushSidePanel([first], second);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("b");
    expect(result[0]!.cards).toEqual([
      { cardId: "BT1-001", badge: 1 },
      { cardId: "BT1-002", badge: 2 },
    ]);
  });

  it("replaces a stale panel of the same title and side instead of merging", () => {
    const first = panel({ id: "a", createdAt: 0 });
    const second = panel({ id: "b", createdAt: 9000, cards: [{ cardId: "BT1-002", badge: 1 }] });
    expect(pushSidePanel([first], second)).toEqual([second]);
  });

  it("keeps panels of the same title but different sides apart", () => {
    const mine = panel({ id: "a", side: "you" });
    const theirs = panel({ id: "b", side: "opp" });
    expect(pushSidePanel([mine], theirs)).toHaveLength(2);
  });

  it("never stacks more than the visible maximum in one column, dropping the oldest there", () => {
    const a = panel({ id: "a", titleKey: "panel.discardedCards", createdAt: 0 });
    const b = panel({ id: "b", titleKey: "panel.deletedCards", createdAt: 1 });
    const c = panel({ id: "c", titleKey: "panel.revealedCards", createdAt: 2 });
    const theirs = panel({ id: "d", side: "opp", titleKey: "panel.playedCard", createdAt: 3 });
    const result = pushSidePanel(pushSidePanel(pushSidePanel([a], b), c), theirs);
    expect(sidePanelColumn(result, "you")).toHaveLength(MAX_VISIBLE_SIDE_PANELS);
    expect(sidePanelColumn(result, "you").map((p) => p.id)).toEqual(["b", "c"]);
    expect(sidePanelColumn(result, "opp").map((p) => p.id)).toEqual(["d"]);
  });
});

describe("side panel lifetimes", () => {
  it("gives every panel the same reading time, however busy the board is", () => {
    const alone = panel({ id: "a", createdAt: 0 });
    expect(sidePanelRemaining(alone, 0)).toBe(SIDE_PANEL_LIFETIME_MS);
    expect(sidePanelRemaining(alone, 1000)).toBe(SIDE_PANEL_LIFETIME_MS - 1000);
  });

  it("counts a panel's clock from when it opened, not from the stack around it", () => {
    const older = panel({ id: "a", createdAt: 0 });
    const newer = panel({ id: "b", titleKey: "panel.deletedCards", createdAt: 2000 });
    expect(sidePanelRemaining(older, 2000)).toBe(SIDE_PANEL_LIFETIME_MS - 2000);
    expect(sidePanelRemaining(newer, 2000)).toBe(SIDE_PANEL_LIFETIME_MS);
  });

  it("keeps a panel for its full reading time and drops it after", () => {
    const only = panel({ createdAt: 0 });
    expect(expireSidePanels([only], SIDE_PANEL_LIFETIME_MS - 1)).toEqual([only]);
    expect(expireSidePanels([only], SIDE_PANEL_LIFETIME_MS)).toEqual([]);
  });

  it("reports the soonest expiry so one step can hold for the whole stack", () => {
    expect(nextSidePanelExpiry([], 0)).toBeNull();
    const older = panel({ id: "a", createdAt: 0 });
    const newer = panel({ id: "b", side: "opp", createdAt: 400 });
    expect(nextSidePanelExpiry([older, newer], 400)).toBe(SIDE_PANEL_LIFETIME_MS - 400);
  });
});

describe("dismissSidePanel", () => {
  it("removes only the named panel", () => {
    const a = panel({ id: "a" });
    const b = panel({ id: "b", side: "opp" });
    expect(dismissSidePanel([a, b], "a")).toEqual([b]);
  });
});

describe("sidePanelColumn", () => {
  it("returns one side's panels oldest first", () => {
    const mineOld = panel({ id: "a", side: "you", createdAt: 1 });
    const mineNew = panel({ id: "b", side: "you", titleKey: "panel.deletedCards", createdAt: 3 });
    const theirs = panel({ id: "c", side: "opp", createdAt: 2 });
    expect(sidePanelColumn([mineNew, mineOld, theirs], "you").map((p) => p.id)).toEqual(["a", "b"]);
    expect(sidePanelColumn([mineNew, mineOld, theirs], "opp").map((p) => p.id)).toEqual(["c"]);
  });
});
