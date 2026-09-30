import { expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

/**
 * Attack a suspended opposing Digimon with a host that has `inheritedCardId` under it, and
 * report the memory gained and whether each side survived the battle.
 */
export async function battleWithInheritedMemoryGain(inheritedCardId: string, defenderDp: number) {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT1-019", as: "host", dp: 5000, under: [inheritedCardId] }] },
    1: { battleArea: [{ card: "BT1-009", as: "defender", dp: defenderDp, suspended: true }] },
  });
  s.state.memory = 0;
  await s.ready();
  const hostId = s.perm("host").permanentId;

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: hostId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();

  return {
    memoryGained: s.state.memory,
    hostSurvived: s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId),
    defenderSurvived: s.state.players[1]!.battleArea.length > 0,
  };
}
