import { GameState, PendingDecision, type SequencedServerEvent } from "@aegis/shared";
import { expect, it } from "vitest";
import { openCombatWindow } from "./combatWindowModel";
import { combatWindowsFor } from "./screen/model/combatWindows";

// Discord 1558162472945586388 (match cae4df4d): the attacker answered its own decision and
// the server opened the defender's Counter window 36 ms later. The event message reached the
// defender before the state patch that cleared the attacker's decision, so the Counter was
// taken as already answered and never shown while the defender's clock ran for 240 s.
function counterAfterOpponentDecision() {
  const state = new GameState();
  state.turnSeat = 1;
  state.pendingDecision = Object.assign(new PendingDecision(), {
    decisionId: "dec-67",
    seat: 1,
    kind: "optional",
  });
  const events: SequencedServerEvent[] = [
    {
      kind: "counterWindowOpened",
      attackerPermanentId: "mervamon",
      defendingSeat: 0,
      eligibleCounters: [{ instanceId: "gallantmon", effectKey: "EX13-015/ir-shared-0", description: "[Counter]" }],
      seq: 652,
      batch: "batch-361",
      stateVersion: 268,
    },
  ];
  const answered = { current: undefined as string | undefined };
  const windows = (decision?: { seat: 0 | 1 }) =>
    combatWindowsFor({
      events,
      state,
      viewerSeat: 0,
      isMyTurn: false,
      mirroredWindow: null,
      decision,
      openCombatWindow: openCombatWindow(events, state, 0),
      answeredCombatWindowKeyRef: answered,
      rolledBackRejectionSeqRef: { current: undefined },
    });
  return { state, windows };
}

it("shows the defender's Counter while the attacker's answered decision is still in synced state", () => {
  const s = counterAfterOpponentDecision();
  expect(s.windows().counterWindow?.eligibleCounters).toHaveLength(1);
  s.state.pendingDecision = undefined;
  expect(s.windows().counterWindow?.eligibleCounters).toHaveLength(1);
});

it("still treats the defender's own nested decision as an accepted Counter", () => {
  const s = counterAfterOpponentDecision();
  expect(s.windows({ seat: 0 }).counterWindow).toBeNull();
});
