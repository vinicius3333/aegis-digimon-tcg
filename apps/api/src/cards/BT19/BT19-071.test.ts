import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/index.js";
import { EffectTiming } from "@aegis/shared";
import "./BT19-071.js";

describe("BT19-071 Beelzemon", () => {
  it("mills two cards and gains Blocker through the public engine path", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-071", as: "beel" }], deck: ["BT1-009", "BT1-009"] } });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("beel"));
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(observe(s.engine).hasKeyword(s.perm("beel"), "Blocker")).toBe(true);
  });

  it("compiles both mill-and-Blocker timings and the once-per-turn mill watcher", () => {
    const card = runtimeCompiledCard("BT19-071");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = card?.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "TrashTopDeck", controller: "mine", amount: 2 }),
        expect.objectContaining({ kind: "GainKeyword", keyword: expect.objectContaining({ keyword: "Blocker" }), duration: "untilOpponentTurnEnd" }),
      ]));
    }
    expect(card?.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDiscardLibrary", sourceFilter: { controller: "mine" }, actions: [{ kind: "Delete" }] }] });
  });
});
