import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { advance } from "../testkit/advance.js";
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

  it("proves the public Giromon-to-Succession producer chain", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-067", as: "base" }],
          hand: [
            { card: "BT26-055", as: "giromon" },
            { card: "BT25-077", as: "hiddenBacchusmon" },
            { card: "BT25-077", as: "visibleBacchusmon" },
            { card: "BT26-080", as: "final" },
            { card: "BT25-078", as: "played" },
          ],
          deck: ["BT1-028", "BT1-028", "BT1-028", "BT1-028"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const baseId = s.perm("base").topCard.instanceId;
    const giromonId = s.inst("giromon").instanceId;
    const hiddenBacchusmonId = s.inst("hiddenBacchusmon").instanceId;
    const visibleBacchusmonId = s.inst("visibleBacchusmon").instanceId;
    const finalId = s.inst("final").instanceId;
    const playedId = s.inst("played").instanceId;
    preferred.push(hiddenBacchusmonId);
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: giromonId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const placeDecision = s.state.pendingDecision!;
    expect(placeDecision.payloadJson).toContain("place");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placeDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === hiddenBacchusmonId));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const giromonDeleteDecision = s.state.pendingDecision!;
    expect(giromonDeleteDecision.decisionId).not.toBe(placeDecision.decisionId);
    expect(giromonDeleteDecision.payloadJson).toContain("Ver.3");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: giromonDeleteDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.inst("visibleBacchusmon").instanceId).toBe(visibleBacchusmonId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([hiddenBacchusmonId, baseId]);
    expect(s.inst("hiddenBacchusmon").faceUp).toBe(false);
    expect(s.state.memory).toBe(7);
    expect(s.inst("played").faceUp).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === visibleBacchusmonId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === playedId)).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: visibleBacchusmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const nativeDecision = s.state.pendingDecision!;
    expect(nativeDecision.decisionId).not.toBe(giromonDeleteDecision.decisionId);
    expect(nativeDecision.payloadJson).toContain("play 1 [TS]");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: nativeDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === visibleBacchusmonId);
    const copiedIntermediateDecision = s.state.pendingDecision!;
    expect(copiedIntermediateDecision.kind).toBe("optional");
    expect(copiedIntermediateDecision.decisionId).not.toBe(nativeDecision.decisionId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: copiedIntermediateDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === playedId)).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: finalId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const finalDecision = s.state.pendingDecision!;
    expect(finalDecision.decisionId).not.toBe(copiedIntermediateDecision.decisionId);
    expect(finalDecision.payloadJson).not.toContain("Three Musketeers");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: finalDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === finalId);
    const copiedFinalDecision = s.state.pendingDecision!;
    expect(copiedFinalDecision.kind).toBe("optional");
    expect(copiedFinalDecision.decisionId).not.toBe(finalDecision.decisionId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: copiedFinalDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === playedId)).toBe(true);
    expect(s.perm("base").topCard.instanceId).toBe(finalId);
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([
      hiddenBacchusmonId,
      baseId,
      giromonId,
      visibleBacchusmonId,
    ]);

    const nextTurn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const staleDecision = s.state.pendingDecision!;
      expect(staleDecision.kind).toBe("optional");
      expect(staleDecision.payloadJson).toContain("[All Turns] [Once Per Turn]");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: staleDecision.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      const memoryBeforePlay = s.state.memory;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const copiedDecision = s.state.pendingDecision!;
      expect(copiedDecision.decisionId).not.toBe(staleDecision.decisionId);
      expect(copiedDecision.payloadJson).toContain(
        "[All Turns] [Once Per Turn] When any Digimon are played or digivolve",
      );
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: copiedDecision.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.perm("base").isSuspended &&
          s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId) &&
          !s.state.players[0]!.hand.some((card) => card.instanceId === playedId) &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.memory).toBe(memoryBeforePlay - 3);
      advance(s.engine).endMainPhaseIfOpen(0);
      await nextTurn;
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    }
  });
});
