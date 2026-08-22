import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-004.js";

describe("LM-004 Thetismon", () => {
  it("registers both entrance timings and the Jellymon inherited watcher as complete IR", () => {
    const compiled = runtimeCompiledCard("LM-004")!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toMatchObject([
        { kind: "Unsuspend", target: { filter: { suspended: true } }, cost: { kind: "trash", target: { count: 2 } }, optional: true },
        { kind: "Unsuspend", target: { filter: { kind: ["Tamer"] } } },
        { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
      ]);
    }
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          sourceFilter: { nameOrTrait: [{ tokens: ["Jellymon"], match: "text" }] },
          actions: [{ kind: "Unsuspend", optional: true }],
        },
      ],
    });
  });

  it("trashes exactly two blue cards to unsuspend a Digimon and Kiyoshiro", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-004", as: "thetismon" },
            { card: "BT1-027", as: "digimon", suspended: true },
            { card: "BT9-086", as: "kiyoshiro", suspended: true },
          ],
          hand: ["BT1-027", "BT1-027"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("thetismon"));
    await settle(
      () =>
        s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-027").length === 2 &&
        !s.perm("digimon").isSuspended &&
        !s.perm("kiyoshiro").isSuspended,
    );
    expect(s.perm("digimon").isSuspended).toBe(false);
    expect(s.perm("kiyoshiro").isSuspended).toBe(false);
  });
});
