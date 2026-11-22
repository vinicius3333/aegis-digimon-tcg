import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DecisionResponse } from "@aegis/shared";
import { runReplay, type ReplayRun } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";

const record = JSON.parse(
  readFileSync(new URL("./grace-novamon-asks-to-end-attack.replay.json", import.meta.url), "utf8"),
) as ReplayRecord;

const triggerOrderInput = 194;
const graceNovamonTriggerIndex = 2;
const endAttackText = "Then, you may end this attack.";

async function respond(run: ReplayRun, response: DecisionResponse) {
  const pending = run.state.pendingDecision!;
  await run.applyIntent(pending.seat, { type: "respondDecision", decisionId: pending.decisionId, response });
}

async function presetTrash(accept: boolean) {
  const run = await runReplay(record, { untilInput: triggerOrderInput });
  const optionalAnswersByIndex = [null, null, accept];
  await respond(run, {
    kind: "orderTriggers",
    order: [],
    orderIndexes: [graceNovamonTriggerIndex],
    optionalAnswersByIndex,
  } as DecisionResponse);
  return run;
}

function pendingPrompt(run: ReplayRun) {
  const pending = run.state.pendingDecision;
  return { seat: pending?.seat, kind: pending?.kind, ...(JSON.parse(pending?.payloadJson ?? "{}") as object) };
}

const endAttackPrompt = {
  seat: 0,
  kind: "optional",
  effectKey: expect.stringContaining("BT25-103"),
  effectTextPart: endAttackText,
};

describe("GraceNovamon asks to end its attack whatever the trigger preset", () => {
  it("replays the recorded match up to the GraceNovamon trigger order", async () => {
    const { divergences } = await runReplay(record, { untilInput: triggerOrderInput });

    expect(divergences).toEqual([]);
  });

  it("asks after a No preset declines the trash", async () => {
    const run = await presetTrash(false);

    expect(pendingPrompt(run)).toMatchObject(endAttackPrompt);
  });

  it("asks after a Yes preset trashes instead of ending the attack automatically", async () => {
    const run = await presetTrash(true);
    const pick = run.state.pendingDecision!;
    const { candidateInstanceIds, max } = JSON.parse(pick.payloadJson) as {
      candidateInstanceIds: string[];
      max: number;
    };
    await respond(run, { kind: "selectCards", instanceIds: candidateInstanceIds.slice(0, max) });

    expect(pendingPrompt(run)).toMatchObject(endAttackPrompt);
  });
});
