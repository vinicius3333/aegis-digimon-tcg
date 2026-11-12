import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";

it("labels a DUAL Option used by another card's effect with the Option's own text", async () => {
  const record: ReplayRecord = JSON.parse(
    readFileSync(new URL("./used-dual-option-prompt-shows-own-text.replay.json", import.meta.url), "utf8"),
  );
  const run = await runReplay(record, { untilInput: 74 });
  try {
    expect(run.divergences).toEqual([]);
    const pending = run.pendingRequest;
    expect(pending?.kind).toBe("optional");
    expect(pending?.sourceCardId).toBe("BT26-032");
    expect(pending?.options?.timing).toBe("Main");
    expect(pending?.options?.effectText).toContain("suspend 2 of your opponent's Digimon or Tamers");
    expect(pending?.options?.effectTextCardId ?? pending?.sourceCardId).toBe("BT26-032");
  } finally {
    run.engine.applyIntent(0, { type: "surrender" });
  }
});
