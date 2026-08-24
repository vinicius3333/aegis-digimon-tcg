import { describe, expect, it } from "vitest";
import type { Seat, ServerEvent } from "@aegis/shared";
import {
  attackAnnouncementFromEvent,
  dismissInfoPanel,
  expireInfoPanels,
  infoPanelFromEvent,
  INFO_PANEL_LIFETIME_MS,
  MAX_VISIBLE_INFO_PANELS,
  orderInfoPanels,
  pushInfoPanel,
  type InfoPanel,
  type InfoPanelLookup,
} from "./infoPanels";

const VIEWER: Seat = 0;

function lookup(cards: Record<string, string>, seats: Record<string, Seat>): InfoPanelLookup {
  return { cardId: (id) => cards[id], seat: (id) => seats[id] };
}

function panel(overrides: Partial<InfoPanel> = {}): InfoPanel {
  return {
    id: "p1",
    titleKey: "panel.discardedCards",
    side: "you",
    cards: [{ cardId: "BT1-001", badge: 1 }],
    createdAt: 0,
    ...overrides,
  };
}

describe("infoPanelFromEvent", () => {
  it("opens a discard panel for cards leaving the hand for the trash", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["a", "b"], from: "hand", to: "trash" };
    const result = infoPanelFromEvent(event, VIEWER, lookup({ a: "BT1-001", b: "BT1-002" }, { a: 0, b: 0 }), "id", 100);
    expect(result).toEqual({
      id: "id",
      titleKey: "panel.discardedCards",
      side: "you",
      cards: [
        { cardId: "BT1-001", badge: 1 },
        { cardId: "BT1-002", badge: 2 },
      ],
      createdAt: 100,
    });
  });

  it("opens a deletion panel for cards leaving the battle area, on the owner's side", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["a"], from: "battleArea", to: "trash" };
    const result = infoPanelFromEvent(event, VIEWER, lookup({ a: "BT1-010" }, { a: 1 }), "id", 0);
    expect(result?.titleKey).toBe("panel.deletedCards");
    expect(result?.side).toBe("opp");
  });

  it("labels an effect trashing from an unnamed source as trashed rather than discarded", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["a"], from: "various", to: "trash" };
    expect(infoPanelFromEvent(event, VIEWER, lookup({ a: "BT1-010" }, { a: 0 }), "id", 0)?.titleKey).toBe(
      "panel.trashedCards",
    );
  });

  it("ignores movements that do not end in the trash", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["a"], from: "deck", to: "hand" };
    expect(infoPanelFromEvent(event, VIEWER, lookup({ a: "BT1-010" }, { a: 0 }), "id", 0)).toBeNull();
  });

  it("skips a movement whose cards cannot be identified yet", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["a"], from: "hand", to: "trash" };
    expect(infoPanelFromEvent(event, VIEWER, lookup({}, {}), "id", 0)).toBeNull();
  });

  it("skips a movement with no resolvable owner", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["a"], from: "hand", to: "trash" };
    expect(infoPanelFromEvent(event, VIEWER, lookup({ a: "BT1-010" }, {}), "id", 0)).toBeNull();
  });

  it("opens a reveal panel for either seat", () => {
    const mine: ServerEvent = { kind: "cardRevealed", seat: 0, cardId: "BT1-020" };
    const theirs: ServerEvent = { kind: "cardRevealed", seat: 1, cardId: "BT1-021" };
    expect(infoPanelFromEvent(mine, VIEWER, lookup({}, {}), "a", 0)?.side).toBe("you");
    expect(infoPanelFromEvent(theirs, VIEWER, lookup({}, {}), "b", 0)?.side).toBe("opp");
    expect(infoPanelFromEvent(theirs, VIEWER, lookup({}, {}), "b", 0)?.titleKey).toBe("panel.revealedCards");
  });

  it("announces only the opponent's played card", () => {
    const mine: ServerEvent = { kind: "cardPlayed", seat: 0, cardId: "BT1-030" };
    const theirs: ServerEvent = { kind: "cardPlayed", seat: 1, cardId: "BT1-031" };
    expect(infoPanelFromEvent(mine, VIEWER, lookup({}, {}), "a", 0)).toBeNull();
    expect(infoPanelFromEvent(theirs, VIEWER, lookup({}, {}), "b", 0)?.titleKey).toBe("panel.playedCard");
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

describe("pushInfoPanel", () => {
  it("merges a follow-up into a fresh panel of the same title and side, renumbering the badges", () => {
    const first = panel({ id: "a", createdAt: 0 });
    const second = panel({ id: "b", createdAt: 500, cards: [{ cardId: "BT1-002", badge: 1 }] });
    const result = pushInfoPanel([first], second);
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
    const result = pushInfoPanel([first], second);
    expect(result).toEqual([second]);
  });

  it("keeps panels of the same title but different sides apart", () => {
    const mine = panel({ id: "a", side: "you" });
    const theirs = panel({ id: "b", side: "opp" });
    expect(pushInfoPanel([mine], theirs)).toHaveLength(2);
  });

  it("never stacks more than the visible maximum, dropping the oldest", () => {
    const a = panel({ id: "a", titleKey: "panel.discardedCards", createdAt: 0 });
    const b = panel({ id: "b", titleKey: "panel.deletedCards", createdAt: 1 });
    const c = panel({ id: "c", titleKey: "panel.revealedCards", createdAt: 2 });
    const result = pushInfoPanel(pushInfoPanel([a], b), c);
    expect(result).toHaveLength(MAX_VISIBLE_INFO_PANELS);
    expect(result.map((p) => p.id)).toEqual(["b", "c"]);
  });
});

describe("expireInfoPanels", () => {
  it("keeps a panel for its full reading time and drops it after", () => {
    const only = panel({ createdAt: 0 });
    expect(expireInfoPanels([only], INFO_PANEL_LIFETIME_MS - 1)).toEqual([only]);
    expect(expireInfoPanels([only], INFO_PANEL_LIFETIME_MS)).toEqual([]);
  });
});

describe("dismissInfoPanel", () => {
  it("removes only the named panel", () => {
    const a = panel({ id: "a" });
    const b = panel({ id: "b", side: "opp" });
    expect(dismissInfoPanel([a, b], "a")).toEqual([b]);
  });
});

describe("orderInfoPanels", () => {
  it("puts opponent panels above the viewer's, oldest first within a side", () => {
    const mineOld = panel({ id: "a", side: "you", createdAt: 1 });
    const mineNew = panel({ id: "b", side: "you", titleKey: "panel.deletedCards", createdAt: 3 });
    const theirs = panel({ id: "c", side: "opp", createdAt: 2 });
    expect(orderInfoPanels([mineNew, mineOld, theirs]).map((p) => p.id)).toEqual(["c", "a", "b"]);
  });
});
