import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-102.js";

describe("BT13-102 Keenan Crier", () => {
  it("offers the opponent a Tamer/Option hand trash, then rewards a decline", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Trash", optional: true, target: { filter: { zone: "hand", controller: "opponent", kind: ["Tamer", "Option"] }, count: 1, upTo: true } });
    expect(actions[1]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "opponentDeclinedTrash" } });
    expect(actions[2]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "opponentDeclinedTrash" } });
  });

  it("reacts to effect-played Digimon on the opponent's turn by suspending for memory", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0];
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { kind: ["Digimon"], byEffect: true }, cost: { kind: "suspend" }, actions: [{ kind: "GainMemory", amount: 1 }] });
  });
});
