import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { cite } from "./_kb.js";
import { internalsOf } from "../testkit/internals.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Finite placement-consumer probe. The egg placement verb is the real producer;
 * BT1-004's inherited DP effect consumes the changed egg stack. ST1-03
 * supplies the hand/deck visibility controls. The face-up egg adds +2000 DP
 * after continuous effects are recomputed. No card effect or event is injected.
 */
describe("scoped placement consumers", () => {
  it("recomputes a face-up egg source before the placement event is dispatched", async () => {
    cite(
      "comprehensive-0292",
      "4-7-5: source cards are face-up unless specified otherwise",
      "703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host" }],
          eggDeck: [{ card: "BT1-004", as: "egg", faceUp: false }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "opponentA" },
            { card: "BT1-011", as: "opponentB" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const hostId = s.perm("host").permanentId;
    const observedHostDP: number[] = [];

    // The egg verb is a production primitive. The direct call is a supplemental
    // seam fixture; a printed card effect does not invoke the placement here.
    // BT1-004 and the neutral hosts use their actual registered behaviors.
    await observe(s.engine).captureSubTriggers(
      async () => {
        await internalsOf(s.engine).primitives.placeUnderFromEggDeck(hostId, 0);
      },
      (event, payload) => {
        if (event === "onAddDigivolutionCards" && payload.subjectPermanentId === hostId) {
          observedHostDP.push(s.perm("host").currentDP);
        }
      },
    );
    await settle();

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-004"]);
    expect(s.perm("host").stack[0]!.faceUp).toBe(true);
    expect(observedHostDP).toEqual([5000]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps a hidden deck source from activating its inherited effect", async () => {
    cite(
      "comprehensive-0292",
      "4-7-5: source cards are face-up unless specified otherwise",
      "703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855",
    );
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host" }], deck: [{ card: "ST1-03", as: "deckTop" }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "opponentA" },
          { card: "BT1-011", as: "opponentB" },
        ],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const observedHostDP: number[] = [];
    await observe(s.engine).captureSubTriggers(
      async () => {
        await internalsOf(s.engine).primitives.placeUnderFromDeck(hostId, 0);
      },
      (event, payload) => {
        if (event === "onAddDigivolutionCards" && payload.subjectPermanentId === hostId) {
          observedHostDP.push(s.perm("host").currentDP);
        }
      },
    );
    expect(s.perm("host").stack[0]!.cardId).toBe("ST1-03");
    expect(s.perm("host").stack[0]!.faceUp).toBe(false);
    expect(observedHostDP).toEqual([3000]);
  });

  it("recomputes before a top digivolution-card placement event", async () => {
    cite(
      "comprehensive-0292",
      "4-7-5: source cards are face-up unless specified otherwise",
      "703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855",
    );
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host" }],
        eggDeck: [{ card: "BT1-004", as: "egg", faceUp: false }],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "opponentA" },
          { card: "BT1-011", as: "opponentB" },
        ],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const observedHostDP: number[] = [];
    await observe(s.engine).captureSubTriggers(
      async () => {
        await internalsOf(s.engine).primitives.placeAsTopFromEggDeck(hostId, 0);
      },
      (event, payload) => {
        if (event === "onAddDigivolutionCards" && payload.subjectPermanentId === hostId) {
          observedHostDP.push(s.perm("host").currentDP);
        }
      },
    );
    expect(s.perm("host").stack[0]!.cardId).toBe("BT1-004");
    expect(s.perm("host").stack[0]!.faceUp).toBe(true);
    expect(observedHostDP).toEqual([5000]);
  });

  it("recomputes before an ordinary face-up placement event", async () => {
    cite(
      "comprehensive-0292",
      "4-7-5: source cards are face-up unless specified otherwise",
      "703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855",
    );
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host" }],
        hand: [{ card: "ST1-03", as: "source" }],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "opponentA" },
          { card: "BT1-011", as: "opponentB" },
        ],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;
    const observedHostDP: number[] = [];
    await observe(s.engine).captureSubTriggers(
      async () => {
        await internalsOf(s.engine).primitives.placeUnder(hostId, [sourceId]);
      },
      (event, payload) => {
        if (event === "onAddDigivolutionCards" && payload.subjectPermanentId === hostId) {
          observedHostDP.push(s.perm("host").currentDP);
        }
      },
    );
    expect(s.perm("host").stack[0]!.cardId).toBe("ST1-03");
    expect(s.perm("host").stack[0]!.faceUp).toBe(true);
    expect(observedHostDP).toEqual([4000]);
  });

  it("refreshes an existing source-count aura before a hidden deck placement event", async () => {
    cite(
      "comprehensive-0292",
      "4-7: a hidden source remains stacked information; adding it changes the physical source count",
      "703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855",
    );
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST1-09", as: "host", under: ["ST1-01", "ST1-03", "ST1-07"] }],
        deck: [{ card: "ST1-03", as: "hidden" }],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const before = getCardDefinition("ST1-09")!.dp! + 1000; // face-up ST1-03 only
    expect(s.perm("host").stack).toHaveLength(3);
    expect(s.perm("host").currentDP).toBe(before);
    const observedHostDP: number[] = [];
    await observe(s.engine).captureSubTriggers(
      async () => {
        await internalsOf(s.engine).primitives.placeUnderFromDeck(hostId, 0);
      },
      (event, payload) => {
        if (event === "onAddDigivolutionCards" && payload.subjectPermanentId === hostId) {
          observedHostDP.push(s.perm("host").currentDP);
        }
      },
    );
    expect(s.perm("host").stack).toHaveLength(4);
    expect(s.perm("host").stack[0]!.instanceId).toBe(s.inst("hidden").instanceId);
    expect(s.perm("host").stack[0]!.faceUp).toBe(false);
    // ST1-01's four-source aura turns on; the hidden ST1-03 supplies no inherited DP.
    expect(observedHostDP).toEqual([before + 1000]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
