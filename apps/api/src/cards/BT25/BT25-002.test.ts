import { describe, expect, it } from "vitest";
import { compiled as BT25_002 } from "./BT25-002.js";
import "../index.js";

describe("BT25-002 Kozenimon", () => {
  it("draws one for each player when your DATA SQUAD Tamer is played", () => {
    const effect = BT25_002.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    const watcher = effect?.actions?.[0] as { event?: string; sourceFilter?: unknown; actions?: unknown[] };
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
    });
    expect(watcher.actions).toEqual([
      { kind: "Draw", amount: 1, controller: "mine" },
      { kind: "Draw", amount: 1, controller: "opponent" },
    ]);
  });
});
