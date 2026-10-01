import { setupEngine } from "./harness.js";

/** Plays `cardId` from hand by Assembly, using `materials` staged in the trash in declaration order. */
export async function playByAssembly(cardId: string, materials: readonly string[], memory: number) {
  const s = setupEngine({
    0: {
      hand: [{ card: cardId, as: "source" }],
      trash: materials.map((card, index) => ({ card, as: `material-${index}` })),
    },
  });
  s.state.memory = memory;
  await s.ready();
  const result = s.engine.applyIntent(0, {
    type: "playCard",
    instanceId: s.inst("source").instanceId,
    assembly: { materialInstanceIds: materials.map((_, index) => s.inst(`material-${index}`).instanceId) },
  });
  return { s, result };
}
