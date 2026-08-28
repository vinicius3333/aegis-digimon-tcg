import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-108.js";

describe("BT12-108 handwritten module", () => {
  it("registers its printed OnUseOption effect without declarative effect record", () => {
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
});

it("deletes a chosen Machine and an opposing Digimon within its DP", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT12-108", as: "option" }], battleArea: [{ card: "BT12-072", as: "machine" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 2;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
  expect(s.state.players[0]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
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
        hand: [{ card: "BT12-072", as: "machine" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("BT12-072");
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
});
