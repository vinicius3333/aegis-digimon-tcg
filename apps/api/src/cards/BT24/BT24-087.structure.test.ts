import { describe, expect, it } from "vitest";
import { compiled as BT24_087 } from "./BT24-087.js";
import "../index.js";

describe("BT24-087 Rei Katsura", () => {
  it("contains the linked-trigger draw/trash/App Fusion sequence", () => {
    const start = BT24_087.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(start?.actions?.[0]).toMatchObject({ kind: "GainMemory", amount: 1 });
    const watcher = BT24_087.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0] as any;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
    });
    expect(watcher?.actions?.[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      cost: { kind: "suspend" },
      optional: true,
      abortOnDecline: true,
    });
    expect(watcher?.actions?.[1]).toMatchObject({ kind: "Trash", target: { filter: { zone: "hand" }, count: 1 } });
    expect(watcher?.actions?.[2]).toMatchObject({
      kind: "AppFuse",
      source: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      from: ["trash"],
      optional: true,
    });
  });
});
