import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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

  it("sets memory to 3 at the start of its owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-090", as: "lui" }] } });
    await s.ready();
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("lui"));
    expect(s.state.memory).toBe(3);
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
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lui").topCard.instanceId,
        effectKey: MAIN_KEY,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]?.breeding?.topCard?.cardId === "BT16-083", 3000);

    expect(s.state.players[0]?.battleArea.map((permanent) => permanent.topCard?.cardId)).not.toContain("BT16-082");
    expect(s.state.players[0]?.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT16-082", "BT1-001"]),
    );
    expect(s.state.players[0]?.breeding?.topCard?.instanceId).toBe(s.inst("big").instanceId);
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
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lui").topCard.instanceId,
        effectKey: MAIN_KEY,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.state.players[0]?.battleArea.map((permanent) => permanent.topCard?.cardId)).toContain("BT16-082");
  });
});
