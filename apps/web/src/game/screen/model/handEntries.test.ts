import { describe, expect, it } from "vitest";
import { CardInstance, type PlayerState } from "@aegis/shared";
import { handEntriesOf } from "./handEntries";

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
});
