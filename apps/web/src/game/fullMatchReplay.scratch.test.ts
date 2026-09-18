// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import type { ServerEvent } from "@aegis/shared";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";

vi.mock("../design/sound", () => ({ playSound: vi.fn() }));
const DIR = "/private/tmp/claude-501/-Users-viniciusluiz-aegis-digimon-tcg/979919b0-85cb-43bd-a2b9-3c5b98c18f44/scratchpad/";
const anchors: MatchCueAnchors = {
  board: { current: null }, permanentCenter: () => undefined,
  yourDeck: { current: null }, oppDeck: { current: null }, yourHandDock: { current: null },
  oppHandStrip: { current: null }, yourSecurity: { current: null }, oppSecurity: { current: null },
};
type Entry = { t: number; kind: "batch"; stateVersion: number; events: ServerEvent[] } | { t: number; kind: "decision"; seat: 0 | 1; pending: boolean; stateVersion?: number };
async function advance(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

for (const viewer of [0, 1] as const) {
  it(`full match replay viewer=${viewer}`, async () => {
    const entries = JSON.parse(readFileSync(DIR + "replay.json", "utf8")) as Entry[];
    let batches: readonly ServerBatch[] = [];
    let props = { batches, decisionPending: false, decisionStateVersion: undefined as number | undefined };
    const view = renderHook(
      (p: typeof props) => useMatchCues({ narrationLimit: 3, batches: p.batches, state: undefined, viewerSeat: viewer, mulliganOpen: false, decisionPending: p.decisionPending, decisionStateVersion: p.decisionStateVersion, anchors, onActionRejected: vi.fn() }),
      { initialProps: props },
    );
    const lines: string[] = [];
    let now = 0;
    const SAMPLE = 100;
    const record = (label: string) => {
      const r = view.result.current;
      lines.push(`${String(Math.round(now)).padStart(7)} ${label.padEnd(10)} showcase=${r.zoneShowcase ? r.zoneShowcase.kind + ":" + r.zoneShowcase.cardId : "-"} pending=${[...r.pendingPermanentIds].join(",") || "-"} clash=${r.securityClash ? r.securityClash.key : "-"} branch=${r.securityBranch ? r.securityBranch.state : "-"} blowHeld=${r.heldBlowState ? "y" : "-"} bursts=${[...r.permanentBursts.keys()].join(",") || "-"}`);
    };
    for (const entry of entries) {
      while (now + SAMPLE <= entry.t) { await advance(SAMPLE); now += SAMPLE; record("sample"); }
      const dt = entry.t - now; if (dt > 0) { await advance(dt); now = entry.t; }
      if (entry.kind === "batch") {
        batches = [...batches, singleServerBatch(entry.events, entry.stateVersion)];
        props = { ...props, batches };
        view.rerender(props); await advance(0);
        record("batch:" + entry.events.map((e) => e.kind).join("|").slice(0, 60));
      } else if (entry.seat === viewer) {
        props = { ...props, decisionPending: entry.pending, decisionStateVersion: entry.pending ? entry.stateVersion : undefined };
        view.rerender(props); await advance(0);
        record(entry.pending ? "decision+" : "decision-");
      }
    }
    for (let i = 0; i < 30; i++) { await advance(SAMPLE); now += SAMPLE; record("tail"); }
    writeFileSync(DIR + `fullreplay-v${viewer}.txt`, lines.join("\n"));
  }, 120000);
}
