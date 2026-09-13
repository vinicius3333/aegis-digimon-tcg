import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-090.js";
import "../index.js";

const MAIN_KEY = `BT16-090/ir-${EffectTiming.OnDeclaration}-0`;

describe("BT16-090 Lui Ohwada", () => {
  it("models the inseparable costs before the optional paid breeding play", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: { kind: "compound", costs: [{ kind: "deleteOwn" }, { kind: "trashBreeding" }] },
          actions: [
            {
              kind: "PlayWithoutCost",
              payCost: true,
              reduceCostBy: 9,
              breeding: true,
              requiresEmpty: "breedingArea",
              optional: true,
            },
          ],
        },
      ],
    });
  });

  it("sets memory to 3 through natural turn progression", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-090", as: "lui" }],
        hand: ["BT1-009"],
        deck: ["BT1-010"],
      },
    });
    await s.ready();
    s.state.isFirstPlayersFirstTurn = true;
    s.state.memory = 2;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
  });

  it("deletes Ukkomon, trashes a breeding Digi-Egg, and plays Big Ukkomon there for 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-090", as: "lui" },
            { card: "BT16-082", as: "ukkomon" },
          ],
          breeding: { card: "BT1-001", as: "egg" },
          hand: [{ card: "BT16-083", as: "big" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const luiId = s.inst("lui").instanceId;
    const ukkoId = s.inst("ukkomon").instanceId;
    const eggId = s.inst("egg").instanceId;
    const bigId = s.inst("big").instanceId;
    const [effect] = observe(s.engine).activatableEffects(s.perm("lui")) as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lui").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]?.breeding?.topCard?.instanceId === bigId && s.state.pendingDecision === undefined,
      3000,
    );

    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.topCard?.instanceId === ukkoId)).toBe(false);
    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.topCard?.instanceId === luiId)).toBe(true);
    expect(s.state.players[0]?.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([ukkoId, eggId]));
    expect(s.state.players[0]?.hand.some((card) => card.instanceId === bigId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("does not delete Ukkomon when the breeding cost cannot be paid", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-090", as: "lui" },
          { card: "BT16-082", as: "ukkomon" },
        ],
      },
    });
    await s.ready();
    const luiId = s.inst("lui").instanceId;
    const ukkoId = s.inst("ukkomon").instanceId;
    const trashBefore = s.state.players[0]!.trash.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lui").topCard.instanceId,
        effectKey: MAIN_KEY,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.state.players[0]?.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([luiId, ukkoId]);
    expect(s.state.players[0]?.trash.map((card) => card.instanceId)).toEqual(trashBefore);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
