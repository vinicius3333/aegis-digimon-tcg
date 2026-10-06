import { describe, expect, it } from "vitest";
import { SERVER_EVENT_KINDS, type ServerEvent } from "@aegis/shared";
import {
  ANIMATION_FAMILIES,
  EVENT_ANIMATIONS,
  animationFamiliesForEvent,
  animationFamilyForStep,
  eventChangesPresentedBoard,
} from "./animationCatalog";
import { announcedBoardVersion } from "./match/present/presentBatch";
import { createEffectSequence } from "./match/effectSequence";

describe("animation engine contract", () => {
  it("requires an explicit presentation for every server event", () => {
    expect(Object.keys(EVENT_ANIMATIONS).sort()).toEqual([...SERVER_EVENT_KINDS].sort());
    for (const policy of Object.values(EVENT_ANIMATIONS))
      for (const family of policy.families) expect(ANIMATION_FAMILIES).toHaveProperty(family);
    expect(EVENT_ANIMATIONS.batchClosed).toMatchObject({ families: [], changesBoard: false });
  });

  it("keeps an announced effect over its preceding board until its results can be shown", () => {
    const trigger: ServerEvent = {
      kind: "effectTriggered",
      seat: 0,
      sourceCardId: "BT1-010",
      effectKey: "main",
      description: "Draw 1.",
    };
    const draw: ServerEvent = { kind: "cardsMoved", instanceIds: ["hidden"], from: "deck", to: "hand", seat: 0 };
    const sequence = createEffectSequence({ viewerSeat: () => 0 });
    expect(eventChangesPresentedBoard(trigger)).toBe(false);
    expect(eventChangesPresentedBoard(draw)).toBe(true);
    expect(announcedBoardVersion([trigger, draw], sequence.observeBatch("b1", 3, [trigger, draw]), 3)).toBe(2);
  });

  it("maps compound movements to all of their visual consequences without reading identities", () => {
    expect(
      animationFamiliesForEvent({ kind: "cardsMoved", instanceIds: ["hidden"], from: "security", to: "hand" }),
    ).toEqual(["zone", "draw", "securityChange"]);
    expect(
      animationFamiliesForEvent({
        kind: "cardsMoved",
        instanceIds: ["public"],
        from: "battleArea",
        to: "trash",
        battleDeletion: true,
        deletedPermanents: [{ permanentId: "p", instanceId: "public", cardId: "BT1-010", seat: 0 }],
      }),
    ).toEqual(["zone", "removal", "battle"]);
    expect(
      animationFamiliesForEvent({
        kind: "cardsMoved",
        instanceIds: ["hidden"],
        from: "deck",
        to: "digivolutionCards",
        deckToUnder: { seat: 0, permanentId: "p", count: 1 },
      }),
    ).toEqual(["zone", "stack"]);
  });

  it.each([
    ["security-deal-flight-2", "opening"],
    ["zone-change-1", "play"],
    ["arrival-light-1", "play"],
    ["effect-source-1", "effect"],
    ["field-clash-1", "battle"],
    ["security-destroyed-1", "securityChange"],
    ["dp-pulse-1", "dp"],
    ["freeze-pulse-1", "restriction"],
    ["deck-riffle-1", "shuffle"],
    ["stack-strip-peel-1", "stack"],
  ] as const)("groups the live recipe %s as %s", (id, family) => {
    expect(animationFamilyForStep({ id })).toBe(family);
  });
});
