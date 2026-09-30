import { describe, expect, it } from "vitest";
import {
  emptyResolutionStrip,
  ownPlanEntries,
  resolutionStripReducer,
  resolvingProgress,
  type ResolutionStripAction,
  type ResolutionStripState,
} from "./resolutionChain";

function run(actions: readonly ResolutionStripAction[], from: ResolutionStripState = emptyResolutionStrip) {
  return actions.reduce(resolutionStripReducer, from);
}

const announced = (sourceCardId: string, seat: 0 | 1 = 0, timing = "OnPlay"): ResolutionStripAction => ({
  type: "announced",
  seat,
  sourceCardId,
  timing,
  description: `clause of ${sourceCardId}`,
});

const statuses = (state: ResolutionStripState) =>
  state.entries?.map((entry) => `${entry.sourceCardId}:${entry.status}`);

describe("resolution chain", () => {
  it("folds a grouped announcement into one entry that fulfils every planned copy", () => {
    const planned = run([
      {
        type: "planned",
        seat: 0,
        source: "own",
        entries: [
          { sourceCardId: "ST8-10" },
          { sourceCardId: "BT20-091" },
          { sourceCardId: "BT20-091" },
          { sourceCardId: "BT20-091" },
        ],
      },
    ]);
    const grouped = run(
      [announced("ST8-10"), { ...announced("BT20-091"), count: 3 } as ResolutionStripAction],
      planned,
    );
    expect(statuses(grouped)).toEqual(["ST8-10:done", "BT20-091:current"]);
    expect(grouped.entries?.[1]?.count).toBe(3);
    const recap = run([{ type: "settled", at: 1 }], grouped).recap;
    expect(recap?.entries.map((entry) => entry.count)).toEqual([undefined, 3]);
  });

  it("lists the viewer's own plan as upcoming and walks it as each effect is announced", () => {
    const planned = run([
      {
        type: "planned",
        seat: 0,
        source: "own",
        entries: [{ sourceCardId: "BT9-065" }, { sourceCardId: "EX4-003" }, { sourceCardId: "BT5-091" }],
      },
    ]);
    expect(statuses(planned)).toEqual(["BT9-065:upcoming", "EX4-003:upcoming", "BT5-091:upcoming"]);

    const second = run([announced("BT9-065"), announced("EX4-003")], planned);
    expect(statuses(second)).toEqual(["BT9-065:done", "EX4-003:current", "BT5-091:upcoming"]);
    expect(resolvingProgress(second.entries)).toMatchObject({ position: 2, total: 3 });
    expect(resolvingProgress(second.entries)?.current?.description).toBe("clause of EX4-003");
    // An open decision about a later effect moves the counter to that effect, never back.
    expect(resolvingProgress(second.entries, "BT5-091")).toMatchObject({ position: 3, total: 3 });
    expect(resolvingProgress(second.entries, "EX4-003")).toMatchObject({ position: 2, total: 3 });
    expect(resolvingProgress(second.entries, "BT9-065")).toBeNull();
  });

  it("keeps the viewer's own plan over the server's echo of it", () => {
    const state = run([
      { type: "planned", seat: 0, source: "own", entries: [{ sourceCardId: "A" }, { sourceCardId: "B" }] },
      { type: "planned", seat: 0, source: "server", entries: [{ timing: "OnPlay" }, { timing: "OnPlay" }] },
    ]);
    expect(statuses(state)).toEqual(["A:upcoming", "B:upcoming"]);
  });

  it("fills an opponent's hidden entry in once its effect is announced", () => {
    const state = run([
      {
        type: "planned",
        seat: 1,
        source: "server",
        entries: [{ timing: "OnPlay" }, { sourceCardId: "LM-002", timing: "StartOfMainPhase" }],
      },
      announced("BT1-020", 1),
    ]);
    expect(statuses(state)).toEqual(["BT1-020:current", "LM-002:upcoming"]);
  });

  it("appends an effect nobody planned, such as one triggered mid-chain", () => {
    const state = run([
      { type: "planned", seat: 0, source: "own", entries: [{ sourceCardId: "A" }, { sourceCardId: "B" }] },
      announced("A"),
      announced("C", 1, "OnDeletion"),
    ]);
    expect(statuses(state)).toEqual(["A:done", "B:upcoming", "C:current"]);
  });

  it("tells two effects of one card apart by timing", () => {
    const state = run([
      {
        type: "planned",
        seat: 0,
        source: "own",
        entries: [
          { sourceCardId: "BT9-065", timing: "OnPlay" },
          { sourceCardId: "BT9-065", timing: "WhenDigivolving" },
        ],
      },
      announced("BT9-065", 0, "whenDigivolving"),
    ]);
    expect(state.entries?.map((entry) => `${entry.timing}:${entry.status}`)).toEqual([
      "OnPlay:upcoming",
      "whenDigivolving:current",
    ]);
  });

  it("ends in a recap of what resolved, dropping planned effects that never came", () => {
    const state = run([
      {
        type: "planned",
        seat: 0,
        source: "own",
        entries: [{ sourceCardId: "A" }, { sourceCardId: "B" }, { sourceCardId: "C" }],
      },
      announced("A"),
      announced("B"),
      { type: "settled", at: 1000 },
    ]);
    expect(state.entries).toBeNull();
    expect(state.recap?.entries.map((entry) => `${entry.sourceCardId}:${entry.status}`)).toEqual(["A:done", "B:done"]);
    expect(state.recap?.endedAt).toBe(1000);
    expect(run([{ type: "dismissRecap" }], state).recap).toBeNull();
  });

  it("shows no strip and keeps no recap for a single effect", () => {
    const state = run([announced("A")]);
    expect(resolvingProgress(state.entries)).toBeNull();
    expect(run([{ type: "settled", at: 1 }], state).recap).toBeNull();
  });

  it("keeps the old recap through a lone effect and drops it once the next chain needs the strip", () => {
    const ended = run([announced("A"), announced("B"), { type: "settled", at: 1 }]);
    expect(ended.recap).not.toBeNull();
    const lone = run([announced("C")], ended);
    expect(lone.recap).toBe(ended.recap);
    expect(run([announced("D")], lone).recap).toBeNull();
  });

  it("reads an own plan off the prompt it answers, in the answered order", () => {
    const options = {
      triggerKeys: ["k1", "k2", "k3"],
      triggerCardIds: ["A", "B", "C"],
      triggerTimings: ["OnPlay", "", "WhenDigivolving"],
      triggerDescriptions: ["a", "b", "c"],
    };
    expect(ownPlanEntries(options, ["k3", "k1", "missing", "k2"])).toEqual([
      { sourceCardId: "C", timing: "WhenDigivolving", description: "c" },
      { sourceCardId: "A", timing: "OnPlay", description: "a" },
      { sourceCardId: "B", description: "b" },
    ]);
  });
});
