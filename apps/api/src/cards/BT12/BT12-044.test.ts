import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-044.js";

describe("BT12-044 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-044");
    expect(module?.cardId).toBe("BT12-044");
    const source = {
      instanceId: "source-044",
      cardId: "BT12-044",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
  });
});

it("gains Security Attack for each opposing Digimon with that keyword", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-044", as: "lamp" }] },
    1: { battleArea: [{ card: "BT12-017", as: "emperor" }] },
  });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("lamp"), "SecurityAttack")).toBe(true);
});

it("does not gain Security Attack when no opposing Digimon has that keyword", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-044", as: "lamp" }] },
    1: { battleArea: [{ card: "BT1-009", as: "plain" }] },
  });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("lamp"), "SecurityAttack")).toBe(false);
});

it("gives one opposing Digimon Security Attack -2 when digivolving", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-044", as: "lamp" }] },
    1: { battleArea: [{ card: "BT1-009", as: "target" }] },
  });
  await s.ready();
  await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("lamp"));
  expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(true);
});
