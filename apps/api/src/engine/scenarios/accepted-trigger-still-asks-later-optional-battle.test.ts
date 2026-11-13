import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DecisionResponse } from "@aegis/shared";
import { runReplay, type ReplayRun } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";

const record = JSON.parse(
  readFileSync(new URL("./accepted-trigger-still-asks-later-optional-battle.replay.json", import.meta.url), "utf8"),
) as ReplayRecord;

const dpBoostTargetInput = 43;
const marsmonPermanentId = "perm-3";
const grizzlymonPermanentId = "perm-4";

async function respond(run: ReplayRun, response: DecisionResponse) {
  const pending = run.state.pendingDecision!;
  await run.applyIntent(pending.seat, { type: "respondDecision", decisionId: pending.decisionId, response });
}

describe("Marsmon accepted from the trigger list", () => {
  it("replays the recorded match up to its +3000 DP target choice", async () => {
    const { divergences } = await runReplay(record, { untilInput: dpBoostTargetInput });

    expect(divergences).toEqual([]);
  });

  it("still asks before its later optional battle and keeps the attack when declined", async () => {
    const run = await runReplay(record, { untilInput: dpBoostTargetInput });
    const opponentBefore = run.state.players[1]!.battleArea.map(({ permanentId }) => permanentId);

    await respond(run, { kind: "chooseTargets", instanceIds: [grizzlymonPermanentId] });

    expect(run.state.pendingDecision).toMatchObject({ seat: 0, kind: "optional" });
    expect(JSON.parse(run.state.pendingDecision!.payloadJson)).toMatchObject({
      effectTextPart: "Then, 1 of your Digimon may battle 1 of your opponent's Digimon.",
    });

    await respond(run, { kind: "optional", accept: false });

    expect(run.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(opponentBefore);
    expect(run.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([marsmonPermanentId, grizzlymonPermanentId]),
    );
  });
});
