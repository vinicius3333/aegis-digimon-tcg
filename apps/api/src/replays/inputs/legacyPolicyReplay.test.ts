import { expect, it } from "vitest";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";
import { recordRoomMatch } from "#api/replays/inputs/roomMatch.fixture";
import { extractReplay } from "#api/replays/inputs/extract";
import { runReplay } from "#api/replays/inputs/run";
import { createEngineSchemaCloner } from "#api/engine/snapshot/schema/createEngineSchemaCloner";

it("executes a policy-absent legacy room recording and its restored snapshot as constructed", async () => {
  const recorded = await recordRoomMatch({ seed: 42, turnLimit: 2 });
  const record = extractReplay(recorded.lines, recorded.matchId);
  expect(record.rules).not.toHaveProperty("rulesPolicy");
  const cut = record.inputs.findIndex(
    (input) => input.kind === "intent" && ["playCard", "digivolve", "attack"].includes(input.intent.type),
  );
  expect(cut).toBeGreaterThan(0);
  const prefix = await runReplay(record, { untilInput: cut, stopOnDivergence: true });
  expect(prefix.divergences).toEqual([]);
  const snapshot = JSON.parse(JSON.stringify(prefix.getSnapshot()));
  const full = await runReplay(record, { stopOnDivergence: true });
  const restored = await runReplay(record, { snapshot, stopOnDivergence: true });
  expect(full.divergences).toEqual([]);
  expect(restored.divergences).toEqual([]);
  expect(full.state.rulesPolicy).toBe(GameRulesPolicy.CONSTRUCTED.value);
  expect(restored.state.toJSON()).toEqual(full.state.toJSON());
  expect(createEngineSchemaCloner().clone(restored.state).rulesPolicy).toBe(GameRulesPolicy.CONSTRUCTED.value);
});
