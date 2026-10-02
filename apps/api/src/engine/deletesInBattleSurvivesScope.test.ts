import { describe, expect, it } from "vitest";
import "../cards/index.js";
import type { PermanentSpec } from "./testkit/harness.js";
import { setupEngine, settle } from "./testkit/harness.js";

interface SurvivesWatcher {
  cardId: string;
  watcher: PermanentSpec;
  attackerCardId: string;
}

// Each card prints "When one of your [...] Digimon deletes an opponent's Digimon in battle and
// survives". The watcher lives on a different permanent than the battling Digimon, so a trade
// must not trigger it, while a surviving winner must.
const SURVIVES_WATCHERS: SurvivesWatcher[] = [
  { cardId: "BT3-094", watcher: { card: "BT3-094", as: "watcher" }, attackerCardId: "BT1-073" },
  { cardId: "BT9-088", watcher: { card: "BT9-088", as: "watcher" }, attackerCardId: "BT1-073" },
  { cardId: "BT7-054", watcher: { card: "BT7-054", as: "watcher" }, attackerCardId: "BT12-032" },
  { cardId: "EX1-041", watcher: { card: "BT1-019", as: "watcher", under: ["EX1-041"] }, attackerCardId: "BT12-030" },
  { cardId: "EX1-043", watcher: { card: "EX1-043", as: "watcher" }, attackerCardId: "BT1-070" },
  { cardId: "EX3-044", watcher: { card: "EX3-044", as: "watcher" }, attackerCardId: "BT1-009" },
  { cardId: "EX5-038", watcher: { card: "EX5-038", as: "watcher" }, attackerCardId: "BT1-019" },
  { cardId: "P-090", watcher: { card: "P-090", as: "watcher", under: ["BT10-044"] }, attackerCardId: "BT1-019" },
];

async function battle(entry: SurvivesWatcher, attackerDp: number) {
  const s = setupEngine(
    {
      0: {
        battleArea: [entry.watcher, { card: entry.attackerCardId, as: "attacker", dp: attackerDp }],
        security: 3,
      },
      1: { battleArea: [{ card: "BT1-014", as: "victim", suspended: true, dp: 3000 }], security: 3 },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
  return s.events.some(
    (event) => event.kind === "effectTriggered" && (event as { sourceCardId?: string }).sourceCardId === entry.cardId,
  );
}

describe("deletes in battle and survives", () => {
  it.each(SURVIVES_WATCHERS)("$cardId ignores a trade where the winner is also deleted", async (entry) => {
    expect(await battle(entry, 3000)).toBe(false);
  });

  it.each(SURVIVES_WATCHERS)("$cardId triggers when the winner survives", async (entry) => {
    expect(await battle(entry, 9000)).toBe(true);
  });
});
