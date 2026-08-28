import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-005.js";
import "../index.js";

describe("BT24-005 Kyokyomon", () => {
  it("reveals exactly three cards and lets the player return them to the top or bottom", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [{ kind: "RevealAdd", revealCount: 3, add: [], rest: "deckTopOrBottom" }],
        },
      ],
    });
  });

  it("reveals and returns all three cards without adding any to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-006", as: "host", under: ["BT24-005"] }],
          hand: [{ card: "BT24-085", as: "addedTamer" }],
          deck: [
            { card: "BT24-085", as: "revealedTamer" },
            { card: "BT24-066", as: "revealedDigimon" },
            { card: "BT1-009", as: "revealedNonMatch" },
            { card: "BT1-001", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const originalDeckIds = s.state.players[0]!.deck.map((card) => card.instanceId).sort();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("addedTamer").instanceId],
    });

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("addedTamer").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId).sort()).toEqual(originalDeckIds);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.deck.every((card) => card.faceUp === false)).toBe(true);
  });

  it("does not reveal when a non-Tamer is added or a different host receives the Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-006", as: "host", under: ["BT24-005"] },
          { card: "BT24-006", as: "otherHost" },
        ],
        hand: [
          { card: "BT24-085", as: "tamer" },
          { card: "BT24-066", as: "digimon" },
        ],
        deck: [{ card: "BT1-001", as: "top" }, "BT1-002", "BT1-003"],
      },
    });

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("digimon").instanceId],
    });
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("otherHost").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("tamer").instanceId],
    });

    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("top").instanceId);
    expect(s.state.players[0]!.deck.every((card) => card.faceUp === false)).toBe(true);
  });
});
