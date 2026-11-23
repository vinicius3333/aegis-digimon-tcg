import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";

const record = JSON.parse(
  readFileSync(new URL("./unsuspend-offers-unsuspended-digimon.replay.json", import.meta.url), "utf8"),
) as ReplayRecord;

const aegiochusmonDigivolveInput = 39;
const aegiochusmonPermanentId = "perm-3";
const suspendedAegiomonPermanentId = "perm-4";

describe("unsuspend 1 of your Digimon offers every Digimon", () => {
  it("replays the recorded match up to the Aegiochusmon: Blue digivolution", async () => {
    const { divergences } = await runReplay(record, { untilInput: aegiochusmonDigivolveInput });

    expect(divergences).toEqual([]);
  });

  it("lets the player keep the suspended Aegiomon by choosing the unsuspended Aegiochusmon: Blue", async () => {
    const run = await runReplay(record, { untilInput: aegiochusmonDigivolveInput });
    const input = record.inputs[aegiochusmonDigivolveInput]!;
    if (input.kind !== "intent") throw new Error("Input #39 is the recorded digivolve choice");
    await run.applyIntent(input.seat, input.intent);

    const pending = run.state.pendingDecision!;
    const request = JSON.parse(pending.payloadJson) as { effectKey?: string; candidateInstanceIds?: string[] };
    expect(request).toMatchObject({ effectKey: "BT25-025/ir-7-0", targetFate: "unsuspend" });
    expect(request.candidateInstanceIds).toEqual(
      expect.arrayContaining([aegiochusmonPermanentId, suspendedAegiomonPermanentId]),
    );

    await run.applyIntent(pending.seat, {
      type: "respondDecision",
      decisionId: pending.decisionId,
      response: { kind: "chooseTargets", instanceIds: [aegiochusmonPermanentId] },
    });

    const suspendedAegiomon = run.state.players[0]!.battleArea.find(
      ({ permanentId }) => permanentId === suspendedAegiomonPermanentId,
    );
    expect(suspendedAegiomon?.isSuspended).toBe(true);
  });
});
