import { GameState, type SequencedServerEvent } from "@aegis/shared";
import { expect, it } from "vitest";
import { openCombatWindow } from "./combatWindowModel";
import { combatWindowsFor } from "./screen/model/combatWindows";

function fixture() {
  const state = new GameState();
  state.turnSeat = 1;
  const events: SequencedServerEvent[] = [
    {
      kind: "counterWindowOpened",
      attackerPermanentId: "shoutmon",
      defendingSeat: 0,
      eligibleCounters: [{ instanceId: "omnimon", effectKey: "blast-dna-digivolve:pair", description: "Blast DNA" }],
      seq: 1,
      batch: "attack",
      stateVersion: 1,
    },
  ];
  const answered = { current: undefined as string | undefined };
  const rolledBack = { current: undefined as number | undefined };
  const windows = (decisionPending = false) =>
    combatWindowsFor({
      events,
      state,
      viewerSeat: 0,
      isMyTurn: false,
      mirroredWindow: null,
      decision: decisionPending ? { seat: 0 } : undefined,
      openCombatWindow: openCombatWindow(events, state, 0),
      answeredCombatWindowKeyRef: answered,
      rolledBackRejectionSeqRef: rolledBack,
    });
  return { events, windows };
}

it("GH5346 does not reopen an answered Counter for a duplicate rejected before the decision patch", () => {
  const s = fixture();
  s.windows().markCombatWindowAnswered();
  s.events.push({
    kind: "actionRejected",
    intent: "respondCounter",
    reason: "decision-pending",
    seq: 2,
    batch: "duplicate",
    stateVersion: 2,
  });
  expect(s.windows().counterWindow).toBeNull();
});

it("GH5346 restores an invalid Counter choice so the player can retry or pass", () => {
  const s = fixture();
  s.windows().markCombatWindowAnswered();
  s.events.push({
    kind: "actionRejected",
    intent: "respondCounter",
    reason: "illegal-target",
    seq: 2,
    batch: "invalid",
    stateVersion: 2,
  });
  expect(s.windows().counterWindow?.eligibleCounters).toHaveLength(1);
  s.windows().markCombatWindowAnswered();
  expect(s.windows().counterWindow).toBeNull();
});

it("GH5346 remembers acceptance from a nested decision across reconnect and between effect prompts", () => {
  const s = fixture();
  // No local click/ref survived reconnect; a direct decision message arrives before state.
  expect(s.windows(true).counterWindow).toBeNull();
  expect(s.windows(false).counterWindow).toBeNull();
  s.events.push({
    kind: "counterResolved",
    attackerPermanentId: "shoutmon",
    activated: true,
    seq: 2,
    batch: "resolved",
    stateVersion: 2,
  });
  expect(s.windows().counterWindow).toBeNull();
  s.events.push({ ...s.events[0]!, seq: 3, batch: "next-attack", stateVersion: 3 });
  expect(s.windows().counterWindow).not.toBeNull();
});
