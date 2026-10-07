import { describe, expect, it } from "vitest";
import { allCards, CardKind, tokenDefinitions, type ManualAction, type ManualPlayer, type Seat } from "@aegis/shared";
import { ManualTable } from "./ManualTable.js";

export function manualTestDeck() {
  const ids = allCards()
    .filter((c) => !c.kinds.includes(CardKind.DigiEgg))
    .slice(0, 13)
    .map((c) => c.cardId);
  return {
    mainDeck: ids.flatMap((id) => Array<string>(4).fill(id)).slice(0, 50),
    eggDeck: [allCards().find((c) => c.kinds.includes(CardKind.DigiEgg))!.cardId],
  };
}
function setup() {
  const table = new ManualTable();
  table.join("Alice", manualTestDeck());
  table.join("Bob", manualTestDeck());
  return table;
}
function act(table: ManualTable, seat: Seat, action: ManualAction) {
  table.apply(seat, { revision: table.state.revision, action });
}
function playing() {
  const t = setup();
  act(t, 0, { type: "ready" });
  act(t, 1, { type: "ready" });
  return t;
}
function cards(player: ManualPlayer): string[] {
  return [
    ...player.hand,
    ...player.deck,
    ...player.eggDeck,
    ...player.security,
    ...player.trash,
    ...player.reveal,
    ...[...player.battle, ...player.breeding].flatMap((s) => [...s.cards, ...s.links]),
  ]
    .map((c) => c.id)
    .sort();
}

describe("manual table", () => {
  it("sets up a match without exposing any hidden pile identities or the other hand", () => {
    const t = playing();
    t.state.players[0]!.hand[0]!.artId = "private-printing";
    for (const seat of [0, 1] as const) {
      const view = t.snapshot(seat, "");
      expect(view.players[seat]!.hand.every((c) => c.cardId && c.id)).toBe(true);
      expect(view.players[1 - seat]!.hand.every((c) => c.cardId === "" && c.id === "" && c.artId === "")).toBe(true);
      for (const p of view.players)
        for (const z of ["deck", "eggDeck", "security"] as const)
          expect(p[z].every((c) => c.cardId === "" && c.id === "")).toBe(true);
      expect(view.players[seat]!.security).toHaveLength(5);
      expect(view.players[seat]!.deck).toHaveLength(40);
    }
  });
  it("permits one mulligan before ready and keeps every physical card", () => {
    const t = setup();
    const before = cards(t.state.players[0]!);
    act(t, 0, { type: "mulligan" });
    expect(cards(t.state.players[0]!)).toEqual(before);
    expect(() => act(t, 0, { type: "mulligan" })).toThrow("Mulligan unavailable");
    act(t, 0, { type: "ready" });
    expect(() => act(t, 0, { type: "first", seat: 1 })).toThrow("Choose first player before ready");
  });
  it("conserves source/link identities across evolution, splitting and stack deletion", () => {
    const t = playing();
    const p = t.state.players[0]!;
    const before = cards(p);
    const [base, evolution, link] = p.hand;
    act(t, 0, { type: "move", card: base!.id, to: "battle" });
    const stack = p.battle[0]!;
    act(t, 0, { type: "move", card: evolution!.id, to: "battle", target: stack.id });
    act(t, 0, { type: "move", card: link!.id, to: "battle", target: stack.id, placement: "link" });
    expect(stack.cards.map((c) => c.id)).toEqual([evolution!.id, base!.id]);
    act(t, 0, { type: "move", card: evolution!.id, to: "trash" });
    act(t, 0, { type: "move", card: base!.id, to: "trash" });
    expect(p.battle[0]!.cards[0]!.id).toBe(link!.id);
    expect(cards(p)).toEqual(before);
    act(t, 0, { type: "moveStack", stack: p.battle[0]!.id, to: "security" });
    expect(cards(p)).toEqual(before);
    expect(t.snapshot(1, "").players[0]!.security.every((c) => !c.cardId)).toBe(true);
  });
  it("rejects foreign cards, malformed commands and stale revisions atomically", () => {
    const t = playing();
    const before = structuredClone(t.state);
    expect(() => act(t, 0, { type: "move", card: t.state.players[1]!.hand[0]!.id, to: "battle" })).toThrow(
      "Card does not belong to your seat",
    );
    expect(t.state).toEqual(before);
    expect(() =>
      t.apply(0, { revision: t.state.revision, action: { type: "take", from: "deck", to: "invalid", count: 1 } }),
    ).toThrow("Invalid pile operation");
    expect(() => t.apply(0, { revision: t.state.revision - 1, action: { type: "memory", value: 3 } })).toThrow(
      "Table changed. Try again.",
    );
    expect(() => act(t, 0, { type: "memory", value: NaN })).toThrow("Memory must be between -10 and 10");
    expect(t.state).toEqual(before);
  });
  it("only explicitly exposes searches to the owner and reveals to both players", () => {
    const t = playing();
    act(t, 0, { type: "inspect", zone: "deck" });
    expect(t.snapshot(0, "").inspection!.cards[0]!.cardId).toBeTruthy();
    expect(t.snapshot(1, "").inspection).toBeNull();
    const searched = t.snapshot(0, "").inspection!.cards[0]!;
    act(t, 0, { type: "move", card: searched.id, to: "hand" });
    expect(t.snapshot(0, "").inspection).toBeNull();
    expect(t.snapshot(1, "").players[0]!.hand.every((c) => !c.cardId)).toBe(true);
    act(t, 0, { type: "take", from: "deck", to: "reveal", count: 3 });
    expect(t.snapshot(1, "").players[0]!.reveal.every((c) => c.cardId && c.id)).toBe(true);
    act(t, 0, { type: "move", card: t.state.players[0]!.reveal[0]!.id, to: "deck" });
    expect(t.snapshot(1, "").players[0]!.deck.every((c) => !c.cardId && !c.id)).toBe(true);
  });
  it("requires the opponent to approve undo and invalidates requests after a new move", () => {
    const t = playing();
    const before = cards(t.state.players[0]!);
    act(t, 0, { type: "take", from: "deck", to: "hand", count: 1 });
    act(t, 0, { type: "undoRequest" });
    expect(() => act(t, 0, { type: "undoReply", accept: true })).toThrow("No opponent correction request");
    act(t, 1, { type: "undoReply", accept: true });
    expect(t.state.players[0]!.hand).toHaveLength(5);
    expect(cards(t.state.players[0]!)).toEqual(before);
    act(t, 0, { type: "memory", value: 5 });
    act(t, 0, { type: "undoRequest" });
    act(t, 1, { type: "memory", value: 3 });
    expect(t.state.undo).toBeNull();
    expect(() => act(t, 1, { type: "undoReply", accept: true })).toThrow("No opponent correction request");
  });
  it("moves whole stacks between breeding/battle and merges sources in order", () => {
    const t = playing();
    const p = t.state.players[0]!;
    const before = cards(p);
    act(t, 0, { type: "take", from: "eggDeck", to: "breeding", count: 1 });
    const egg = p.breeding[0]!;
    act(t, 0, { type: "move", card: p.hand[0]!.id, to: "breeding", target: egg.id });
    act(t, 0, { type: "moveStack", stack: egg.id, to: "battle" });
    act(t, 0, { type: "move", card: p.hand[0]!.id, to: "battle" });
    const target = p.battle[1]!;
    const expected = [...target.cards, ...egg.cards].map((c) => c.id);
    act(t, 0, { type: "moveStack", stack: egg.id, to: "battle", target: target.id, placement: "bottom" });
    expect(target.cards.map((c) => c.id)).toEqual(expected);
    expect(cards(p)).toEqual(before);
  });
  it("never executes rules when changing memory, suspending or announcing an attack", () => {
    const t = playing();
    act(t, 0, { type: "move", card: t.state.players[0]!.hand[0]!.id, to: "battle" });
    const stack = t.state.players[0]!.battle[0]!;
    act(t, 0, { type: "memory", value: -10 });
    expect(t.state.turn).toBe(0);
    act(t, 0, { type: "suspend", stack: stack.id, value: true });
    act(t, 0, { type: "attack", stack: stack.id });
    expect(t.state.players[1]!.security).toHaveLength(5);
    act(t, 0, { type: "concede" });
    expect(t.state.winner).toBe(1);
  });
  it("reorders existing evolution sources without duplicating physical cards", () => {
    const t = playing();
    const p = t.state.players[0]!;
    const before = cards(p);
    const [base, top] = p.hand;
    act(t, 0, { type: "move", card: base!.id, to: "battle" });
    const stack = p.battle[0]!;
    act(t, 0, { type: "move", card: top!.id, to: "battle", target: stack.id });
    act(t, 0, { type: "move", card: base!.id, to: "battle", target: stack.id, placement: "top" });
    expect(stack.cards.map((card) => card.id)).toEqual([base!.id, top!.id]);
    expect(cards(p)).toEqual(before);
  });
  it("creates and removes only catalog tokens without consuming printed cards", () => {
    const t = playing();
    const before = cards(t.state.players[0]!);
    act(t, 0, { type: "spawnToken", cardId: tokenDefinitions[0]!.cardId });
    const token = t.state.players[0]!.battle[0]!.cards[0]!;
    expect(t.snapshot(1, "").players[0]!.battle[0]!.cards[0]!.cardId).toBe(token.cardId);
    expect(() => act(t, 0, { type: "removeToken", card: t.state.players[0]!.hand[0]!.id })).toThrow(
      "Only tokens can be removed",
    );
    act(t, 0, { type: "removeToken", card: token.id });
    expect(cards(t.state.players[0]!)).toEqual(before);
    expect(() => act(t, 0, { type: "spawnToken", cardId: "BT1-010" })).toThrow("Choose a catalog token");
  });
  it("preserves top-to-bottom source order when returning stacks to the bottom of a deck", () => {
    const t = playing();
    const p = t.state.players[0]!;
    const [base, top] = p.hand;
    act(t, 0, { type: "move", card: base!.id, to: "battle" });
    const stack = p.battle[0]!;
    act(t, 0, { type: "move", card: top!.id, to: "battle", target: stack.id });
    act(t, 0, { type: "moveStack", stack: stack.id, to: "deck", placement: "bottom" });
    expect(p.deck.slice(-2).map((card) => card.id)).toEqual([top!.id, base!.id]);
  });
  it("identifies announced attacks without exposing facedown identities", () => {
    const t = playing();
    act(t, 0, { type: "move", card: t.state.players[0]!.hand[0]!.id, to: "battle" });
    act(t, 1, { type: "move", card: t.state.players[1]!.hand[0]!.id, to: "battle" });
    const a = t.state.players[0]!.battle[0]!;
    const b = t.state.players[1]!.battle[0]!;
    act(t, 1, { type: "flip", card: b.cards[0]!.id, faceUp: false });
    act(t, 0, { type: "attack", stack: a.id, target: b.id });
    expect(t.state.history.at(-1)!.detail).toContain(`#${a.id.slice(0, 4)}`);
    expect(t.state.history.at(-1)!.detail).toContain(`→ ? #${b.id.slice(0, 4)}`);
    expect(t.state.players[1]!.security).toHaveLength(5);
  });
});
