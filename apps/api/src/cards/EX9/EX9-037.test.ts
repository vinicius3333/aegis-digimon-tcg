import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-037.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-037", () => {
  it("suspends an opposing Digimon and prevents that same target from unsuspending until the opponent's turn end", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Suspend", cost: { kind: "place", target: { filter: { zone: "hand" } } } }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd", target: { sameTarget: true } }] });
  });
  it("inherits once-per-turn suspension when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Suspend", target: { filter: { controller: "opponent" } } }] }));

  it("places any hand card face-down, suspends the chosen opponent, and prevents its unsuspend", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-037", as: "source" }], hand: ["BT1-001"] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: false }] } }, { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.state.players[0].hand).toHaveLength(0);
    expect(s.perm("source").stack.map((card) => card.faceUp)).toEqual([false]);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("opponent").permanentId]);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });
});
