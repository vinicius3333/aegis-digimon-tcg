import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

const STACKED_INFORMATION_SHA256 = "1220b7f0fc0cb6ccc76d4ad371d1f788922a265df857413971108e64da24bc0f";
const SUCCESSION_SHA256 = "d09f994eb5ef5e46d70b28d7d019215d5dc5856d3ec1ffee10d6db6dfa3df717";

describe("public Succession source priority", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0293",
      "4-7-9/10: a face-down stacked card has no referenceable card information",
      STACKED_INFORMATION_SHA256,
    );
    cite(
      "comprehensive-0324",
      "§16-47: Succession copies effects from the highest matching face-up source",
      SUCCESSION_SHA256,
    );
  });

  it("copies the visible Bacchusmon watcher while ignoring a lower hidden copy", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-078", as: "played" }],
          battleArea: [{ card: "BT26-080", as: "host", under: [{ card: "BT25-077", faceUp: false }, "BT25-077"] }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    const hiddenId = s.perm("host").stack[0]!.instanceId;
    const visibleId = s.perm("host").stack[1]!.instanceId;
    const playedId = s.inst("played").instanceId;
    const memoryBefore = s.state.memory;
    const opponentBattleBefore = s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId);
    const opponentTrashBefore = s.state.players[1]!.trash.map((card) => card.instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([hiddenId, visibleId]);
    expect(s.inst("played").faceUp).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(decision.payloadJson).toContain("[All Turns] [Once Per Turn] When any Digimon are played or digivolve");
    expect(decision.payloadJson).not.toContain(hiddenId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId) &&
        !s.state.players[0]!.hand.some((card) => card.instanceId === playedId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === playedId)).toBe(false);
    expect(s.state.memory).toBe(memoryBefore - 3);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
      opponentBattleBefore,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(opponentTrashBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not expose a Bacchusmon watcher when every matching source is face down", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT25-078", as: "played" }],
        battleArea: [
          {
            card: "BT26-080",
            as: "host",
            under: [
              { card: "BT25-077", faceUp: false },
              { card: "BT25-077", faceUp: false },
            ],
          },
        ],
      },
    });
    await s.ready();
    const playedId = s.inst("played").instanceId;
    const memoryBefore = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId) &&
        !s.state.players[0]!.hand.some((card) => card.instanceId === playedId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === playedId)).toBe(false);
    expect(s.state.memory).toBe(memoryBefore - 3);
  });

  it("filters a hidden highest matching source before selecting the visible provider", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-078", as: "played" }],
          battleArea: [
            {
              card: "BT26-080",
              as: "host",
              under: [
                { card: "BT26-080", faceUp: true },
                { card: "BT25-077", faceUp: true },
                { card: "BT26-080", faceUp: false },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    const playedId = s.inst("played").instanceId;
    const memoryBefore = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(decision.payloadJson).toContain("[All Turns] [Once Per Turn] When any Digimon are played or digivolve");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId) &&
        !s.state.players[0]!.hand.some((card) => card.instanceId === playedId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === playedId)).toBe(false);
    expect(s.state.memory).toBe(memoryBefore - 3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
