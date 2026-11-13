import { readFileSync } from "node:fs";
import type { SequencedServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runReplay, type ReplayRecord } from "../../replays/inputs/index.js";

const fixture = new URL("./immune-target-keeps-when-digivolving-disable.replay.json", import.meta.url);
const record = JSON.parse(readFileSync(fixture, "utf8")) as ReplayRecord;
const digivolveIntoPaladinInputs = [93, 94];

describe("When Digivolving disable on an immune Digimon", () => {
  it("replays the match up to the digivolution into Imperialdramon: Paladin Mode as recorded", async () => {
    const { divergences } = await runReplay(record, { untilInput: digivolveIntoPaladinInputs[0] });

    expect(divergences).toEqual([]);
  });

  it("applies once the immunity ends, so the digivolved Digimon can't activate [When Digivolving]", async () => {
    const events: SequencedServerEvent[] = [];
    const replay = await runReplay(record, {
      untilInput: digivolveIntoPaladinInputs[0],
      onBatch: (_state, batch) => events.push(...batch),
    });
    const magnamon = replay.state.players[1]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT16-102")!;
    expect(magnamon.currentDP).toBe(magnamon.baseDP - 3000);

    const eventsBefore = events.length;
    for (const index of digivolveIntoPaladinInputs) {
      const input = record.inputs[index]!;
      if (input.kind !== "intent") throw new Error(`expected a recorded intent at input ${index}`);
      expect(await replay.applyIntent(input.seat, input.intent)).toEqual({ ok: true });
    }

    const digivolved = replay.state.players[1]!.battleArea.find(
      (permanent) => permanent.permanentId === magnamon.permanentId,
    )!;
    expect(digivolved.topCard.cardId).toBe("EX13-076");
    expect(replay.state.pendingDecision).toBeUndefined();
    expect(
      events.slice(eventsBefore).some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX13-076"),
    ).toBe(false);
  });
});
