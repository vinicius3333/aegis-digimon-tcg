import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-024.js";
import "../index.js";

describe("BT24-024 Submarimon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-024")).toMatchObject({
      cardId: "BT24-024",
      nameEn: "Submarimon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Armor Form"],
      attributes: ["Free"],
      types: ["Aquatic", "Iliad", "TS"],
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
    });
  });

  it("plays a TS Tamer from hand with a once-per-turn cost reduction", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: true,
      reduceCostBy: 2,
      optional: true,
    });
    expect(effect.actions[0].target.filter).toMatchObject({
      kind: ["Tamer"],
      nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
    });
  });

  it("retains Armor Purge and both alternate digivolution requirements", () => {
    expect(compiled.effects[0]?.keywords?.[0]?.keyword).toBe("Armor Purge");
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Armadillomon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["TS"], cost: 2, isAlternate: true },
    ]);
  });

  it("plays a TS Tamer for its play cost reduced by 2, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-024", as: "submarimon" }],
          hand: [
            { card: "BT24-084", as: "firstTamer" },
            { card: "BT24-088", as: "secondTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("submarimon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-084"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("submarimon"));

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("firstTamer").instanceId,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondTamer").instanceId);
  });

  it("may decline the reduced-cost Tamer play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-024", as: "submarimon" }],
          hand: [{ card: "BT24-084", as: "tamer" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("submarimon"));

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tamer").instanceId);
  });

  it("uses Armor Purge to survive deletion by trashing its top card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-024", as: "submarimon", under: ["BT24-020"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("submarimon"), "Armor Purge")).toBe(true);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("submarimon").permanentId], "byEffect")).toBe(0);

    expect(s.perm("submarimon").topCard.cardId).toBe("BT24-020");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT24-024");
  });

  it.each([
    ["Armadillomon", "BT1-027", 0],
    ["level 3 TS", "BT24-020", 1],
  ])("digivolves from %s for cost 2", async (_label, baseCard, alternateRequirementIndex) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-024", as: "submarimon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("submarimon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("submarimon").instanceId);

    expect(s.state.memory).toBe(3);
  });
});
