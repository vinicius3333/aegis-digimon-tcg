import { expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

async function digivolveAndReadMemory(sourceCardId: string, targetCardId: string, area: "battleArea" | "breeding") {
  const s = setupEngine({
    0: {
      ...(area === "breeding"
        ? { breeding: { card: sourceCardId, as: "source" } }
        : { battleArea: [{ card: sourceCardId, as: "source" }] }),
      hand: [{ card: targetCardId, as: "target" }],
    },
  });
  s.state.memory = 5;
  await s.ready();

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("source").permanentId,
      instanceId: s.inst("target").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("source").topCard.cardId === targetCardId);
  await settle(() => s.state.pendingDecision === undefined);
  return {
    memory: s.state.memory,
    sourceEffectFired: s.events.some((event) => "sourceCardId" in event && event.sourceCardId === sourceCardId),
  };
}

/**
 * Q: does the [Your Turn] "reduce the digivolution cost by 1" effect trigger while this card
 * is in the breeding area? A: no, effects don't trigger in the breeding area.
 */
export async function expectNoCostReductionInBreeding(sourceCardId: string, targetCardId: string) {
  const battleArea = await digivolveAndReadMemory(sourceCardId, targetCardId, "battleArea");
  const breeding = await digivolveAndReadMemory(sourceCardId, targetCardId, "breeding");

  expect(breeding.memory).toBe(battleArea.memory - 1);
  expect(breeding.sourceEffectFired).toBe(false);
}
