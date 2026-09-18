// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, it, vi } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";

vi.mock("../design/sound", () => ({ playSound: vi.fn() }));

const anchors: MatchCueAnchors = {
  board: { current: null },
  permanentCenter: () => undefined,
  yourDeck: { current: null },
  oppDeck: { current: null },
  yourHandDock: { current: null },
  oppHandStrip: { current: null },
  yourSecurity: { current: null },
  oppSecurity: { current: null },
};

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function harness(viewerSeat: 0 | 1, decision: { pending: boolean; version?: number } = { pending: false }) {
  let batches: readonly ServerBatch[] = [];
  let version = 0;
  const view = renderHook(
    (props: { batches: readonly ServerBatch[]; decisionPending: boolean; decisionStateVersion?: number }) =>
      useMatchCues({
        narrationLimit: 3,
        batches: props.batches,
        state: undefined,
        viewerSeat,
        mulliganOpen: false,
        decisionPending: props.decisionPending,
        decisionStateVersion: props.decisionStateVersion,
        anchors,
        onActionRejected: vi.fn(),
      }),
    { initialProps: { batches, decisionPending: decision.pending, decisionStateVersion: decision.version } },
  );
  return {
    result: view.result,
    push(events: ServerEvent[], d = decision) {
      batches = [...batches, singleServerBatch(events, (version += 1))];
      view.rerender({ batches, decisionPending: d.pending, decisionStateVersion: d.version });
    },
  };
}

import { appendFileSync } from "node:fs";
function snap(label: string, r: ReturnType<typeof useMatchCues>) {
  appendFileSync("/private/tmp/claude-501/-Users-viniciusluiz-aegis-digimon-tcg/979919b0-85cb-43bd-a2b9-3c5b98c18f44/scratchpad/replay.txt", [
    label.padEnd(28),
    "showcase=" + (r.zoneShowcase ? r.zoneShowcase.kind + ":" + r.zoneShowcase.cardId : "null"),
    "pending=" + JSON.stringify([...r.pendingPermanentIds]),
    "bursts=" + JSON.stringify([...r.permanentBursts.keys()]),
  ].join(" ") + "\n");
}

const NORMAL_BATCH: ServerEvent[] = [
  { kind: "cardsMoved", instanceIds: ["s1-15"], from: "hand", to: "battleArea" },
  { kind: "digivolved", seat: 1, permanentId: "perm-3", cardId: "BT26-011", artId: "BT26-011", mechanic: "normal", inBreeding: false },
  { kind: "memoryChanged", from: 3, to: 1, reason: "payCost" },
  { kind: "memoryChanged", from: 3, to: 1, reason: "digivolve" },
] as ServerEvent[];
const NORMAL_DRAW: ServerEvent[] = [
  { kind: "cardsMoved", instanceIds: ["s1-47"], from: "deck", to: "hand", seat: 1, drawReason: "digivolution" },
] as ServerEvent[];
const NORMAL_TRIGGER: ServerEvent[] = [
  { kind: "effectTriggered", seat: 1, sourceCardId: "BT26-011", sourceInstanceId: "s1-15", sourcePermanentId: "perm-3", effectKey: "BT26-011/ir-7-0", description: "[On Play] [When Digivolving] draw" },
] as ServerEvent[];

const EFFECT_TRIGGER: ServerEvent[] = [
  { kind: "effectTriggered", seat: 1, sourceCardId: "BT26-001", sourceInstanceId: "s1-52", sourcePermanentId: "perm-3", effectKey: "subtrigger/131/whenEffectAddsToDeck", description: "[Your Turn] may digivolve" },
] as ServerEvent[];
const EFFECT_BATCH: ServerEvent[] = [
  { kind: "memoryChanged", from: 1, to: -2, reason: "digivolve" },
  { kind: "cardsMoved", instanceIds: ["s1-24"], from: "various", to: "battleArea" },
  { kind: "digivolved", seat: 1, permanentId: "perm-3", cardId: "BT26-073", artId: "BT26-073", mechanic: "normal", inBreeding: false },
  { kind: "cardsMoved", instanceIds: ["s1-25"], from: "deck", to: "hand", seat: 1, drawReason: "digivolution" },
] as ServerEvent[];
const EFFECT_RESOLVED: ServerEvent[] = [
  { kind: "effectResolved", seat: 1, sourceCardId: "BT26-001", sourceInstanceId: "s1-52", sourcePermanentId: "perm-3", effectKey: "subtrigger/131/whenEffectAddsToDeck", description: "[Your Turn] may digivolve" },
] as ServerEvent[];
const EFFECT_WHEN_DIGI: ServerEvent[] = [
  { kind: "effectTriggered", seat: 1, sourceCardId: "BT26-073", sourceInstanceId: "s1-24", sourcePermanentId: "perm-3", effectKey: "BT26-073/when-digivolving-cost-delete", description: "[When Digivolving] by deleting" },
] as ServerEvent[];

for (const viewer of [0, 1] as const) {
  it(`normal digivolve viewer=${viewer}`, async () => {
    const h = harness(viewer);
    h.push(NORMAL_BATCH); h.push(NORMAL_DRAW); h.push(NORMAL_TRIGGER);
    for (const t of [0, 50, 500, 1000, 1800, 1900, 2800, 3500]) { await advance(t === 0 ? 0 : t - prev(t)); snap(`normal v${viewer} t=${t}`, h.result.current); }
  });
  it(`effect digivolve viewer=${viewer}`, async () => {
    const h = harness(viewer);
    h.push(EFFECT_TRIGGER); await advance(800);
    h.push(EFFECT_BATCH); h.push(EFFECT_RESOLVED); h.push(EFFECT_WHEN_DIGI);
    for (const t of [0, 50, 500, 1000, 1800, 1900, 2800, 3500]) { await advance(t === 0 ? 0 : t - prev(t)); snap(`effect v${viewer} t=${t}`, h.result.current); }
  });
}
const STEPS = [0, 50, 500, 1000, 1800, 1900, 2800, 3500];
function prev(t: number) { return STEPS[STEPS.indexOf(t) - 1]; }
