import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-102.js";

describe("BT13-102 Keenan Crier", () => {
  it("offers the opponent a Tamer/Option hand trash, then rewards a decline", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions ?? [];
    expect(actions[0]).toMatchObject({
      kind: "Trash",
      chooser: "opponent",
      optional: true,
      target: { filter: { zone: "hand", controller: "opponent", kind: ["Tamer", "Option"] }, count: 1, upTo: true },
    });
    expect(actions[1]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "opponentDeclinedTrash" } });
    expect(actions[2]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: { kind: "opponentDeclinedTrash" },
    });
  });

  it("reacts to effect-played Digimon on the opponent's turn by suspending for memory", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { kind: ["Digimon"], byEffect: true },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("trashes an opposing Tamer through the optional hand choice", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-102", as: "keenan" }], deck: [{ card: "BT1-001", as: "drawn" }] },
        1: { hand: [{ card: "BT13-094", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("keenan"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT13-094"));
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT13-094");
  });
});
