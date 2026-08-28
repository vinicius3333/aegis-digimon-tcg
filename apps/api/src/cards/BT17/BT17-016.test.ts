import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-016.js";

describe("BT17-016", () => {
  it("deletes an opposing Digimon at 8000 DP or less on digivolution or attack", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { dp: { op: "lte", value: 8000 } } },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "ModifyDP",
        amount: 3000,
        duration: "untilOpponentTurnEnd",
        condition: { kind: "ifThisEffectDidNotDelete" },
      });
      expect(effect.actions?.[2]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
        condition: { kind: "ifThisEffectDidNotDelete" },
      });
    }
  });

  it("gains immunity for the turn at 0 or less memory", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          grant: { immunity: true },
          duration: "forTheTurn",
          condition: { kind: "memoryAtMost", value: 0 },
        },
      ],
    });
  });

  it("deletes an opposing 8000 DP Digimon through a natural evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-013", as: "base" }],
          hand: [{ card: "BT17-016", as: "gallant" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-016");

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("gains DP and Blocker after a natural attack finds no opposing Digimon within range", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-016", as: "gallant" }] },
      1: { battleArea: [{ card: "BT1-059", as: "target" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("gallant"), "Blocker"));

    expect(s.perm("gallant").currentDP).toBe(14000);
    expect(observe(s.engine).hasKeyword(s.perm("gallant"), "Blocker")).toBe(true);
  });
});
