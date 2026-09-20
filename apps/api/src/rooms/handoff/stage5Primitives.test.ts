import { describe, expect, it } from "vitest";
import {
  activateDormantBotRoster,
  allocateContinuityId,
  commitResultSideEffect,
  compensatePausedDeadline,
  createContinuityState,
  createDeadlineFrame,
  createDormantBotRoster,
  createMigrationPauseReceipt,
  createResultOutboxFrame,
  nextContinuityRandom,
  pendingResultSideEffects,
  restoreDormantBotRoster,
  restoreMigrationPauseReceipt,
  transferResultOutbox,
} from "./stage5Primitives.js";

describe("handoff continuity primitives", () => {
  it("validates and round-trips a server migration pause receipt", () => {
    const receipt = createMigrationPauseReceipt({ transferId: "transfer-1", pausedAtMs: 2_000, resumedAtMs: 5_000 });
    expect(restoreMigrationPauseReceipt(receipt)).toEqual(receipt);
    expect(() =>
      createMigrationPauseReceipt({ transferId: "transfer-1", pausedAtMs: 5_000, resumedAtMs: 2_000 }),
    ).toThrow("migration pause interval is reversed");
  });

  it("continues deterministic random and ID streams from an explicit JSON frame", () => {
    const initial = createContinuityState(1, { inst: 40 });
    const firstDraw = nextContinuityRandom(initial);
    expect(firstDraw.value).toBe(0.6270739405881613);
    const secondDraw = nextContinuityRandom(firstDraw.state);
    expect(secondDraw.value).toBe(0.002735721180215478);

    const transferred = JSON.parse(JSON.stringify(secondDraw.state)) as typeof secondDraw.state;
    const originalThirdDraw = nextContinuityRandom(secondDraw.state);
    const restoredThirdDraw = nextContinuityRandom(transferred);
    expect(originalThirdDraw.value).toBe(0.5274470399599522);
    expect(restoredThirdDraw).toEqual(originalThirdDraw);

    const originalId = allocateContinuityId(originalThirdDraw.state, "inst");
    const restoredId = allocateContinuityId(restoredThirdDraw.state, "inst");
    expect(originalId.id).toBe("inst-41");
    expect(restoredId).toEqual(originalId);
  });

  it("compensates only handoff downtime and ignores repeated transfer compensation", () => {
    const initial = createDeadlineFrame({ timerId: "series-7", kind: "series-deadline", dueAtMs: 10_000 });
    const afterFirstTransfer = compensatePausedDeadline(initial, {
      transferId: "transfer-a",
      pausedAtMs: 2_000,
      resumedAtMs: 5_000,
    });
    expect(afterFirstTransfer.dueAtMs).toBe(13_000);

    const restored = JSON.parse(JSON.stringify(afterFirstTransfer)) as typeof afterFirstTransfer;
    const repeatedFirstTransfer = compensatePausedDeadline(restored, {
      transferId: "transfer-a",
      pausedAtMs: 2_000,
      resumedAtMs: 5_000,
    });
    expect(repeatedFirstTransfer).toEqual(restored);

    const afterSecondTransfer = compensatePausedDeadline(repeatedFirstTransfer, {
      transferId: "transfer-b",
      pausedAtMs: 7_000,
      resumedAtMs: 9_000,
    });
    expect(afterSecondTransfer.dueAtMs).toBe(15_000);
    expect(
      compensatePausedDeadline(afterSecondTransfer, {
        transferId: "transfer-b",
        pausedAtMs: 7_000,
        resumedAtMs: 9_000,
      }),
    ).toEqual(afterSecondTransfer);
  });

  it("keeps bot-vs-bot descriptors dormant across restore even with no connected clients", () => {
    const descriptor = createDormantBotRoster({
      gameId: "game-bot-bot",
      ownerEpoch: 12,
      connectedClientSeats: [],
      bots: [
        {
          seat: 0,
          participantId: "bot-0",
          profile: "balanced",
          seed: 123,
          turnCount: 4,
          rngState: 765,
          policyRngState: 432,
          pendingThinkMs: 0,
        },
        {
          seat: 1,
          participantId: "bot-1",
          profile: "aggressive",
          seed: 456,
          turnCount: 4,
          rngState: 654,
          policyRngState: 234,
          pendingThinkMs: 150,
        },
      ],
    });
    const imported = restoreDormantBotRoster(JSON.parse(JSON.stringify(descriptor)) as typeof descriptor);

    expect(imported.activation).toBe("dormant");
    expect(imported.connectedClientSeats).toEqual([]);
    expect(imported.bots.map(({ seat, participantId }) => [seat, participantId])).toEqual([
      [0, "bot-0"],
      [1, "bot-1"],
    ]);
    expect(() => activateDormantBotRoster(imported, { gameId: "game-bot-bot", ownerEpoch: 11 })).toThrow(
      /current owner epoch/,
    );
    expect(activateDormantBotRoster(imported, { gameId: "game-bot-bot", ownerEpoch: 12 }).activation).toBe("active");
  });

  it("preserves stable result-effect keys and suppresses committed effects after repeated transfers", () => {
    const initial = createResultOutboxFrame({
      gameId: "tournament-game-9",
      resultId: "result-1",
      ownerEpoch: 4,
      effects: ["ranked-record", "series-result", "advance-series"],
    });
    const afterTransfer = transferResultOutbox(initial, 5);
    const keys = afterTransfer.effects.map((effect) => effect.idempotencyKey);
    expect(keys).toEqual([
      "tournament-game-9:result-1:ranked-record",
      "tournament-game-9:result-1:series-result",
      "tournament-game-9:result-1:advance-series",
    ]);

    const completed = commitResultSideEffect(afterTransfer, keys[0]!, 5);
    const secondTransfer = transferResultOutbox(completed, 6);
    const duplicateCommit = commitResultSideEffect(secondTransfer, keys[0]!, 6);
    expect(duplicateCommit).toEqual(secondTransfer);
    expect(pendingResultSideEffects(duplicateCommit).map((effect) => effect.kind)).toEqual([
      "series-result",
      "advance-series",
    ]);
    expect(() => commitResultSideEffect(secondTransfer, keys[1]!, 5)).toThrow(/stale owner epoch/);
    expect(
      createResultOutboxFrame({
        gameId: "tournament-game-9",
        resultId: "result-1",
        ownerEpoch: 6,
        effects: ["ranked-record", "series-result", "advance-series"],
      }).effects.map((effect) => effect.idempotencyKey),
    ).toEqual(keys);
  });
});
