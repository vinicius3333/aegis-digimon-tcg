import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-108.js";

describe("BT12-108 compiled module", () => {
  it("registers its printed OnUseOption effect from declarative IR", () => {
    const module = getEffectModule("BT12-108");
    expect(module?.cardId).toBe("BT12-108");
    const source = {
      instanceId: "source-108",
      cardId: "BT12-108",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });

  it("binds the Machine/Cyborg choice and uses its DP snapshot for both deletions", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const main = runtimeCompiledCard("BT12-108")!.effects.find((effect) => effect.trigger === "Main");
    expect(main?.actions.map((action) => action.kind)).toEqual(["SelectBind", "Delete", "Delete"]);
    expect(main?.actions[0]).toMatchObject({
      target: { bindAs: "chosenMachine", count: 1, orFilters: [{ nameOrTrait: [{ tokens: ["Cyborg"] }] }] },
    });
    expect(main?.actions[1]).toMatchObject({
      target: { filter: { relativeTo: { attr: "dp", op: "lte", selectionRef: "chosenMachine" } } },
    });
    expect(main?.actions[2]).toMatchObject({ target: { fromSelectionRef: "chosenMachine" } });
  });
});

it("deletes a chosen Machine and an opposing Digimon within its DP", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT12-108", as: "option" }], battleArea: [{ card: "BT3-057", as: "machine" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "target", dp: 5000 },
          { card: "BT1-009", as: "overCap", dp: 15000 },
        ],
        security: ["BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 2;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 1);
  expect(s.state.players[0]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.battleArea).toHaveLength(1);
  expect(s.perm("overCap").topCard.cardId).toBe("BT1-009");
});

it("accepts the Cyborg branch of the Main selector and still deletes that source", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT12-108", as: "option" }],
        battleArea: [
          { card: "BT1-021", as: "cyborg", dp: 8000 },
          { card: "BT12-095", as: "blackSource" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "withinCap", dp: 5000 },
          { card: "BT1-044", as: "overCap", dp: 10000 },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 2;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.players[1]!.battleArea.length === 1);
  expect(s.state.players[0]!.battleArea).toHaveLength(1);
  expect(s.perm("blackSource").topCard.cardId).toBe("BT12-095");
  expect(s.perm("overCap").topCard.cardId).toBe("BT1-044");
});

it("registers its printed Security trash-and-delete effect", () => {
  const module = getEffectModule("BT12-108");
  const source = { instanceId: "source-108", cardId: "BT12-108", ownerSeat: 0, isOnBattleArea: () => false } as never;
  expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
});

it("trashes a Machine from hand and deletes an opposing Digimon within its play cost", async () => {
  const s = setupEngine(
    {
      0: {
        security: [{ card: "BT12-108", as: "option", faceUp: true }],
        hand: [{ card: "BT1-042", as: "machine" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "target" },
          { card: "BT1-044", as: "overCost" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("BT1-042");
  expect(s.state.players[1]!.battleArea).toHaveLength(1);
  expect(s.perm("overCost").topCard.cardId).toBe("BT1-044");
});

it("does not pay the Security cost or delete when hand has no Machine/Cyborg card", async () => {
  const s = setupEngine(
    {
      0: {
        security: [{ card: "BT12-108", as: "option", faceUp: true }],
        hand: [{ card: "BT1-009", as: "notEligible" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  expect(s.state.players[1]!.battleArea).toHaveLength(1);
});
