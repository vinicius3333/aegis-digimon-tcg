import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-102.js";

describe("BT12-102 handwritten module", () => {
  it("registers its printed OnUseOption effect without declarative effect record", () => {
    const module = getEffectModule("BT12-102");
    expect(module?.cardId).toBe("BT12-102");
    const source = {
      instanceId: "source-102",
      cardId: "BT12-102",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.BeforePayCost, source)).toHaveLength(1);
  });
});

it("keeps the compiled security effect activating the Main effect", async () => {
  const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
  const card = runtimeCompiledCard("BT12-102")!;
  expect(card.coverage).toBe("full");
  expect(card.residual).toEqual([]);
  expect(card.effects.find((effect) => effect.trigger === "Security")).toBeDefined();
});

it("returns an opposing Digimon to its owner's deck", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT12-102", as: "option" }], battleArea: [{ card: "BT1-029", as: "blue" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 9;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.battleArea.length === 0);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toContain("BT1-009");
});

it("reduces its play cost by 3 by placing one blue Digimon under another", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT12-102", as: "option" }],
        battleArea: [
          { card: "BT1-029", as: "moved" },
          { card: "BT1-029", as: "destination" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const movedPermanentId = s.perm("moved").permanentId;
  s.state.memory = 6;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-029" && p.stack.length > 1));

  expect(s.state.memory).toBe(0);
  expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === movedPermanentId)).toBe(false);
  expect(s.perm("destination").stack.map(({ cardId }) => cardId)).toContain("BT1-029");
});
