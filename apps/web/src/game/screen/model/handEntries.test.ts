import { describe, expect, it } from "vitest";
import { CardInstance, type PlayerState } from "@aegis/shared";
import { handEntriesOf, sortedHandInstanceIds, retainHandOrder } from "./handEntries";

describe("handEntriesOf", () => {
  it("GitHub #5197: renders a spectator snapshot whose private hand is withheld", () => {
    const viewer = { handCount: 5 } as PlayerState;
    expect(
      handEntriesOf({ viewer, shownHand: undefined, handHeld: false, optimisticPlayedInstanceId: undefined }),
    ).toEqual({ handEntries: [], shownHandEntries: [] });
  });
  it("preserves a visible player's projections and held cards", () => {
    const visible = new CardInstance();
    visible.instanceId = "visible";
    visible.cardId = "ST22-03";
    visible.playableFromHand = true;
    visible.projectedPlayCost = 4;
    const departing = new CardInstance();
    departing.instanceId = "departing";
    departing.cardId = "ST22-02";
    const viewer = { hand: [visible] } as unknown as PlayerState;
    const entries = handEntriesOf({
      viewer,
      shownHand: [departing, visible],
      handHeld: true,
      optimisticPlayedInstanceId: undefined,
    });
    expect(entries.handEntries).toHaveLength(1);
    expect(entries.shownHandEntries).toMatchObject([
      { instanceId: "departing", playableFromHand: false },
      { instanceId: "visible", playableFromHand: true, projectedPlayCost: 4 },
    ]);
  });
  it("GitHub #5205: sorts only the displayed hand while preserving instance IDs, projections and stable duplicate order", () => {
    const hand = ["BT1-084", "BT1-087", "BT1-009", "BT1-104", "BT1-009"].map((cardId, index) => {
      const card = new CardInstance();
      card.cardId = cardId;
      card.instanceId = `card-${index}`;
      card.projectedPlayCost = index;
      return card;
    });
    const viewer = { hand } as unknown as PlayerState;
    const input = { viewer, shownHand: undefined, handHeld: false, optimisticPlayedInstanceId: undefined };
    const handOrder = sortedHandInstanceIds(handEntriesOf(input).shownHandEntries);
    const sorted = handEntriesOf({ ...input, handOrder });
    expect(sorted.shownHandEntries.map((card) => card.instanceId)).toEqual([
      "card-2",
      "card-4",
      "card-0",
      "card-1",
      "card-3",
    ]);
    expect(sorted.shownHandEntries.map((card) => card.projectedPlayCost)).toEqual([2, 4, 0, 1, 3]);
    const draw = new CardInstance();
    draw.cardId = "BT1-009";
    draw.instanceId = "new-draw";
    hand.push(draw);
    expect(handEntriesOf({ ...input, handOrder }).shownHandEntries.at(-1)?.instanceId).toBe("new-draw");
    const resorted = sortedHandInstanceIds(handEntriesOf({ ...input, handOrder }).shownHandEntries);
    expect(resorted.indexOf("new-draw")).toBe(2);
    expect(sorted.handEntries.map((card) => card.instanceId)).toEqual(hand.slice(0, -1).map((card) => card.instanceId));
    expect(handEntriesOf(input).shownHandEntries.map((card) => card.instanceId)).toEqual(
      hand.map((card) => card.instanceId),
    );
  });
});

it("forgets a departed card's sorted position when the same instance returns", () => {
  const cards = ["a", "b", "c"].map((instanceId) => {
    const card = new CardInstance();
    card.instanceId = instanceId;
    card.cardId = "BT1-009";
    return card;
  });
  const order = retainHandOrder(["a", "b"], [cards[1]!]);
  const viewer = { hand: [cards[1], cards[2], cards[0]] } as unknown as PlayerState;
  expect(
    handEntriesOf({
      viewer,
      handOrder: order,
      shownHand: undefined,
      handHeld: false,
      optimisticPlayedInstanceId: undefined,
    }).shownHandEntries.map((card) => card.instanceId),
  ).toEqual(["b", "c", "a"]);
});
