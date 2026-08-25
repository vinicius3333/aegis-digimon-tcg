import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-007.js";

describe("BT15-007", () => {
  it("reveals four and adds a red card, trashing the printed hand cost", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom" }],
    });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ cost: { kind: "trash", target: { count: 1 } } });
  });
  it("gains 1 memory once per turn when an opponent's security is removed", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    }));

  it("pays with a qualifying Bird, reveals four, adds one red card, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-007", as: "biyomon", under: ["BT15-001"] }],
          hand: [
            { card: "BT1-012", as: "birdCost" },
            { card: "BT1-033", as: "seaAnimal" },
          ],
          deck: [
            { card: "BT1-009", as: "redHit" },
            { card: "BT1-045", as: "greenMiss" },
            { card: "BT1-055", as: "blackMiss" },
            { card: "BT1-069", as: "purpleMiss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("biyomon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redHit").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("birdCost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("seaAnimal").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("gains memory once only for opposing security removed during its owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT15-007"] }] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.memory).toBe(0);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(1);

    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(1);
  });
});
