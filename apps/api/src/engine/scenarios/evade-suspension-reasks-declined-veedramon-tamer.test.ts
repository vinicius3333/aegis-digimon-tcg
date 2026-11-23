import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";

const record = JSON.parse(
  readFileSync(new URL("./evade-suspension-reasks-declined-veedramon-tamer.replay.json", import.meta.url), "utf8"),
) as ReplayRecord;

const secondEvadeInput = 69;
const veedramonPermanentId = "perm-3";
const rinaPermanentId = "perm-8";

describe("Rina Shinomiya after a declined Veedramon suspension", () => {
  it("replays the recorded match up to the second Evade", async () => {
    const { divergences } = await runReplay(record, { untilInput: secondEvadeInput });

    expect(divergences).toEqual([]);
  });

  it("asks again when the same Veedramon suspends a second time that turn", async () => {
    const run = await runReplay(record, { untilInput: secondEvadeInput });
    const rina = run.state.players[1]!.battleArea.find(({ permanentId }) => permanentId === rinaPermanentId);
    expect(rina?.topCard?.cardId).toBe("BT11-112");
    expect(rina?.isSuspended).toBe(false);

    await run.applyIntent(1, { type: "respondEvade", accept: true, permanentId: veedramonPermanentId });

    expect(run.state.pendingDecision).toMatchObject({ seat: 1, kind: "optional" });
    expect(JSON.parse(run.state.pendingDecision!.payloadJson)).toMatchObject({
      effectText: expect.stringContaining("When one of your Digimon with [Veedramon] in its name becomes suspended"),
    });
  });
});
