import { describe, expect, it } from "vitest";
import { DECK_BOTTOM, type Seat, type ServerEvent } from "@aegis/shared";
import {
  attackAnnouncementFromEvent,
  dismissSidePanel,
  expireSidePanels,
  MAX_VISIBLE_SIDE_PANELS,
  nextSidePanelExpiry,
  pushSidePanel,
  selectionPanel,
  sidePanelColumn,
  sidePanelFromEvent,
  sidePanelLifetime,
  sidePanelRemaining,
  SIDE_PANEL_CROWDED_LIFETIME_MS,
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

  it("numbers a reveal from its first card, because reveal order is the point", () => {
    const theirs: ServerEvent = { kind: "cardRevealed", seat: 1, cardId: "BT1-021" };
    const result = sidePanelFromEvent(theirs, VIEWER, lookup({}, {}), "b", 0);
    expect(result?.titleKey).toBe("panel.revealedCards");
    expect(result?.side).toBe("opp");
    expect(result?.ordered).toBe(true);
  });

  it("announces only the opponent's played card", () => {
    const mine: ServerEvent = { kind: "cardPlayed", seat: 0, cardId: "BT1-030" };
    const theirs: ServerEvent = { kind: "cardPlayed", seat: 1, cardId: "BT1-031" };
    expect(sidePanelFromEvent(mine, VIEWER, lookup({}, {}), "a", 0)).toBeNull();
    expect(sidePanelFromEvent(theirs, VIEWER, lookup({}, {}), "b", 0)?.titleKey).toBe("panel.playedCard");
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
});

describe("selectionPanel", () => {
  it("numbers the viewer's picks in the order they were made", () => {
    expect(selectionPanel(["BT1-001", "BT1-002"], "s", 3)).toEqual({
      id: "s",
      titleKey: "panel.selectedCards",
      side: "you",
      cards: [
        { cardId: "BT1-001", badge: 1 },
        { cardId: "BT1-002", badge: 2 },
      ],
      ordered: true,
      createdAt: 3,
    });
  });

  it("opens nothing for an empty selection", () => {
    expect(selectionPanel([], "s", 0)).toBeNull();
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
  it("gives a lone panel its full reading time and a crowded column less", () => {
    expect(sidePanelLifetime(1)).toBe(SIDE_PANEL_LIFETIME_MS);
    expect(sidePanelLifetime(2)).toBe(SIDE_PANEL_CROWDED_LIFETIME_MS);
    expect(SIDE_PANEL_CROWDED_LIFETIME_MS).toBeLessThan(SIDE_PANEL_LIFETIME_MS);
  });

  it("erodes a panel faster once a second one joins its column", () => {
    const alone = panel({ id: "a", createdAt: 0 });
    expect(sidePanelRemaining([alone], alone, 0)).toBe(SIDE_PANEL_LIFETIME_MS);
    const crowded = [alone, panel({ id: "b", titleKey: "panel.deletedCards", createdAt: 0 })];
    expect(sidePanelRemaining(crowded, alone, 0)).toBe(SIDE_PANEL_CROWDED_LIFETIME_MS);
  });

  it("leaves the other column's clock alone", () => {
    const mine = panel({ id: "a", side: "you", createdAt: 0 });
    const theirs = panel({ id: "b", side: "opp", createdAt: 0 });
    expect(sidePanelRemaining([mine, theirs], mine, 0)).toBe(SIDE_PANEL_LIFETIME_MS);
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
