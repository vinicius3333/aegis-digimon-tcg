import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-002.js";
import "./BT6-096.js";

describe("BT6-096 Forbidden Trident", () => {
  it("delegates the printed stack cleanup to Return instead of effect-driven trash", () => {
    const main = runtimeCompiledCard("BT6-096")!.effects.find((effect) => effect.trigger === "Main")!;
    const subTrigger = main.actions.find((action) => action.kind === "SubTrigger");
    expect(subTrigger?.kind).toBe("SubTrigger");
    if (!subTrigger || subTrigger.kind !== "SubTrigger") throw new Error("missing When Attacking grant");

    expect(subTrigger.actions.map((action) => action.kind)).toEqual(["SelectBind", "Return"]);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-096", as: "security", faceUp: true }] } });
    const instanceId = s.inst("security").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
  });

  it("gives one Digimon +2000 DP and the printed When Attacking bounce for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-019", under: ["BT6-002"], as: "attacker" }],
          deck: [{ card: "BT1-010", as: "notDrawn" }],
          hand: [{ card: "BT6-096", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "rookie", under: ["BT1-010", "BT1-011"] },
            // A level-4 bystander proves the granted attack targets only level 3.
            { card: "BT6-044", as: "tooHigh" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const rookieInstanceId = s.perm("rookie").topCard!.instanceId;
    const sourceInstanceIds = s.perm("rookie").stack.map((card) => card.instanceId);
    const tooHighId = s.perm("tooHigh").permanentId;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("attacker"));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("attacker").currentDP === 4000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === rookieInstanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceInstanceIds));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === tooHighId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notDrawn").instanceId]);
  });
});
