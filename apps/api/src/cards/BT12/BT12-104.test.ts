import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-104.js";

describe("BT12-104 handwritten module", () => {
  it("registers its printed OnUseOption effect without declarative effect record", () => {
    const module = getEffectModule("BT12-104");
    expect(module?.cardId).toBe("BT12-104");
    const source = {
      instanceId: "source-104",
      cardId: "BT12-104",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
});

it("plays Marcus Damon and gives up to three opposing Digimon -2000 DP per yellow/red Tamer", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [
          { card: "BT12-104", as: "option" },
          { card: "BT12-092", as: "marcus" },
        ],
        battleArea: [{ card: "BT12-092", as: "tamer" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "target1", dp: 5000 },
          { card: "BT1-009", as: "target2", dp: 5000 },
          { card: "BT1-009", as: "target3", dp: 5000 },
        ],
        security: ["BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 5;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(
    () =>
      s.perm("target1").currentDP === 1000 &&
      s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-092"),
  );
  expect(s.perm("target1").currentDP).toBe(1000);
  expect(s.perm("target2").currentDP).toBe(1000);
  expect(s.perm("target3").currentDP).toBe(1000);
});
