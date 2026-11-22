import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";
import { settle } from "#api/engine/testkit/harness";

it("lets Mother D-Reaper reduce the play cost of a D-Reaper Tamer played from hand", async () => {
  const record: ReplayRecord = JSON.parse(
    readFileSync(new URL("./mother-d-reaper-reduces-d-reaper-tamer-play-cost.replay.json", import.meta.url), "utf8"),
  );
  const run = await runReplay(record, { untilInput: 50 });
  try {
    expect(run.divergences).toEqual([]);
    const seat = run.state.players[1]!;
    const mother = seat.battleArea.find((permanent) => permanent.topCard.cardId === "EX2-007")!;
    expect(mother.stack).toHaveLength(2);
    const tamer = seat.hand.find((card) => card.cardId === "P-158")!;
    const memoryBefore = run.state.memory;

    expect(await run.applyIntent(1, { type: "playCard", instanceId: tamer.instanceId })).toEqual({ ok: true });
    await settle(() => run.state.pendingDecision?.kind === "optional");
    const reduction = run.state.pendingDecision!;
    expect(reduction.seat).toBe(1);
    expect(
      await run.applyIntent(1, {
        type: "respondDecision",
        decisionId: reduction.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      run.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === tamer.instanceId),
    );

    expect(run.state.memory).toBe(memoryBefore - 2);
  } finally {
    run.engine.applyIntent(0, { type: "surrender" });
  }
});
