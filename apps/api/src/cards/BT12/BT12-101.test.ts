import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-101.js";
import "./BT12-102.js";
import "./BT12-103.js";
import "./BT12-104.js";
import "./BT12-105.js";
import "./BT12-106.js";
import "./BT12-107.js";
import "./BT12-108.js";
import "./BT12-109.js";
import "./BT12-110.js";

describe("BT12-101 compiled IR module", () => {
  it("registers its Main and Security clauses through the declarative record", () => {
    const module = getEffectModule("BT12-101");
    expect(module?.cardId).toBe("BT12-101");
    const source = {
      instanceId: "source-101",
      cardId: "BT12-101",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });

  it("keeps the compiled Main and Security semantics aligned with the catalog", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard("BT12-101")!;
    expect(card.coverage).toBe("full");
    expect(card.residual).toEqual([]);
    expect(card.effects.find((effect) => effect.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 3,
    });
    expect(card.effects.find((effect) => effect.trigger === "Security")).toBeDefined();
  });

  it("uses the structural Free trait for the optional blue Digimon play", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const play = runtimeCompiledCard("BT12-101")!
      .effects.find((effect) => effect.trigger === "Main")
      ?.actions.find((action) => action.kind === "PlayWithoutCost");
    expect(play).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: {
          colors: ["Blue"],
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [{ tokens: ["Free"], match: "trait" }],
        },
      },
    });
  });
});

it("registers the printed Security activation for BT12-101", () => {
  const module = getEffectModule("BT12-101");
  const source = { instanceId: "source-101", cardId: "BT12-101", ownerSeat: 0, isOnBattleArea: () => false } as never;
  expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
});

it("trashes exactly the top three sources, then optionally plays a blue Free Digimon", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [
          { card: "BT12-101", as: "option" },
          { card: "BT1-027", as: "free" },
        ],
        battleArea: [
          { card: "BT12-045", as: "green" },
          { card: "BT12-090", as: "blueSource" },
        ],
      },
      1: {
        battleArea: [
          {
            card: "BT1-009",
            as: "target",
            under: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 10;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("target").stack.length === 1);
  await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-027"));

  // Stack storage is bottom-to-top, so trashing the top three leaves the original bottom card.
  expect(s.perm("target").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
  expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-027")).toBe(true);
});

it("does not play the blue Free Digimon when no green Digimon is present", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [
          { card: "BT12-101", as: "option" },
          { card: "BT1-027", as: "free" },
        ],
        battleArea: [{ card: "BT12-090", as: "blueSource" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", under: ["BT1-010", "BT1-011", "BT1-012"] }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 10;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("target").stack.length === 0);

  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-027");
  expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-027")).toBe(false);
});

it("registers the printed Security effects for BT12-102 through BT12-110", () => {
  for (const cardId of [
    "BT12-102",
    "BT12-103",
    "BT12-104",
    "BT12-105",
    "BT12-106",
    "BT12-107",
    "BT12-108",
    "BT12-109",
    "BT12-110",
  ]) {
    const module = getEffectModule(cardId);
    const source = { instanceId: `source-${cardId}`, cardId, ownerSeat: 0, isOnBattleArea: () => false } as never;
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  }
});
