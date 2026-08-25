import { describe, expect, it } from "vitest";
import { Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./BT20-013.js";

describe("BT20-013 BaoHuckmon", () => {
  it("once per turn optionally plays a qualifying name from hand with a two-cost reduction", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ trigger: "Main", frequency: "OncePerTurn" });
    expect(main?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Sistermon", "Gankoomon"], match: "name" }],
        },
        count: 1,
      },
      from: ["hand"],
      payCost: true,
      reduceCostBy: 2,
      optional: true,
    });
    expect(main?.actions).toHaveLength(1);
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", target: { count: "all" }, amount: 1000, duration: "permanent" }],
    });
  });

  it("plays a qualifying name for exactly 2 less and consumes the once-per-turn activation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-013", as: "bao" }],
          hand: [
            { card: "BT20-084", as: "sistermon" },
            { card: "BT20-010", as: "nonMatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const effects = observe(s.engine).activatableEffects(s.perm("bao")) as { effectKey: string }[];
    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("bao").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-084"));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonMatch").instanceId);

    const second = s.give(0, Zone.Hand, { card: "BT20-084", as: "second" });
    const retry = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("bao").topCard.instanceId,
      effectKey: effects[0]!.effectKey,
    });
    expect(retry.ok).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(second.instanceId);
  });

  it("observably grants +1000 DP to all allies only during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-014", dp: 7000, as: "host", under: ["BT20-013"] },
          { card: "BT20-010", dp: 1000, as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "BT20-010", dp: 1000, as: "opponent" }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(8000);
    expect(s.perm("ally").currentDP).toBe(2000);
    expect(s.perm("opponent").currentDP).toBe(1000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.perm("ally").currentDP).toBe(1000);
  });
});
