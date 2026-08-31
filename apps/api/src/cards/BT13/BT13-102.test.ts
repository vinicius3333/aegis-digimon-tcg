import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-102.js";
import "./BT13-101.js";
import "./BT13-035.js";

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

  it("gains memory and draws when the opponent declines the optional hand trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-102", as: "keenan" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { hand: [] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("keenan"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("suspends for memory when the opponent effect-plays a Digimon, not for ordinary play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-102", as: "keenan" }] },
        1: { battleArea: [{ card: "BT13-101", as: "opponentTamer" }], hand: [{ card: "BT13-035", as: "pawn" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("opponentTamer"));
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-035"));
    expect(s.perm("keenan").isSuspended).toBe(true);
  });

  it("does not react when the opponent ordinarily plays a Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-102", as: "keenan" }] },
        1: { hand: [{ card: "BT13-035", as: "ordinary" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("ordinary").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-035"));

    expect(s.perm("keenan").isSuspended).toBe(false);
  });
});
