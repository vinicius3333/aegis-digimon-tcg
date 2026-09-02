import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-002.js";
import "./BT6-098.js";

describe("BT6-098 Raddle Star", () => {
  it("delegates both printed stack cleanups to Return instead of effect-driven trash", () => {
    const main = runtimeCompiledCard("BT6-098")!.effects.find((effect) => effect.trigger === "Main")!;
    const branch = main.actions.find((action) => action.kind === "ConditionalBranch");
    expect(branch?.kind).toBe("ConditionalBranch");
    if (!branch || branch.kind !== "ConditionalBranch") throw new Error("missing Raddle Star branch");

    expect(branch.ifTrue.map((action) => action.kind)).toEqual(["SelectBind", "Return"]);
    expect(branch.ifFalse?.map((action) => action.kind)).toEqual(["SelectBind", "Return"]);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT6-098", as: "security", faceUp: true }] },
        1: { battleArea: [{ card: "BT6-021", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetInstanceId = s.perm("target").topCard.instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });

  it("returns a level 5 or lower Digimon to hand when the opponent has fewer than 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-019", under: ["BT6-002"], as: "watcher" }],
          deck: [{ card: "BT1-010", as: "notDrawn" }],
          hand: [{ card: "BT6-098", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT6-021", as: "target", under: ["BT6-020", "BT6-022"] },
            { card: "BT6-044", as: "tooHigh" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    const tooHighId = s.perm("tooHigh").permanentId;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("watcher"));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId));

    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT6-020", "BT6-022"]),
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === tooHighId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notDrawn").instanceId]);
  });

  it("returns any chosen Digimon to deck bottom instead when the opponent has 3 or more", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-019", under: ["BT6-002"], as: "watcher" }],
          deck: [{ card: "BT1-010", as: "notDrawn" }],
          hand: [{ card: "BT6-098", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT6-044", as: "target", under: ["BT6-020", "BT6-022"] },
            { card: "BT1-009", as: "other1" },
            { card: "BT1-014", as: "other2" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    const targetInstanceId = s.perm("target").topCard!.instanceId;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("watcher"));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === targetInstanceId));

    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(targetInstanceId);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId)).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT6-020", "BT6-022"]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notDrawn").instanceId]);
  });
});
