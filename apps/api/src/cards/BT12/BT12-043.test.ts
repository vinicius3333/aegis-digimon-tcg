import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-043.js";

describe("BT12-043 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-043");
    expect(module?.cardId).toBe("BT12-043");
    const source = {
      instanceId: "source-043",
      cardId: "BT12-043",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
  });
});

it("gives Marcus cards Security Attack +1 but only gives DP to effective Digimon", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT12-043", as: "shine" },
        { card: "BT12-092", dp: 3000, as: "marcus" },
      ],
    },
  });
  await s.ready();
  expect(s.perm("marcus").currentDP).toBe(s.perm("marcus").baseDP);
  expect(observe(s.engine).hasKeyword(s.perm("marcus"), "SecurityAttack")).toBe(true);
});

it("scales the digivolution DP reduction for each yellow or red Tamer", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT12-043", as: "shine" },
        { card: "BT12-092", as: "yellowTamer" },
        { card: "BT12-092", as: "redTamer" },
      ],
    },
    1: {
      battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }],
      security: ["BT1-009"],
    },
  });
  await s.ready();
  await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("shine"));
  expect(s.perm("target").currentDP).toBe(4000);
  expect(observe(s.engine).securityDp(1)).toBe(-6000);
});

it("chooses one opposing Digimon for the complete per-Tamer reduction", async () => {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-043", as: "shine" },
          { card: "BT12-092", as: "yellowTamer" },
          { card: "BT12-092", as: "redTamer" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "chosen", dp: 10000 },
          { card: "BT1-009", as: "spared", dp: 10000 },
        ],
      },
    },
    { autoSelectCards: true, preferInstanceIds: preferred },
  );
  preferred.push(s.perm("chosen").topCard!.instanceId);
  await s.ready();
  await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("shine"));
  expect(s.perm("chosen").currentDP).toBe(4000);
  expect(s.perm("spared").currentDP).toBe(10000);
});

it("does not count a Tamer whose color is neither yellow nor red", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT12-043", as: "shine" },
        { card: "BT12-093", as: "greenTamer" },
      ],
    },
    1: {
      battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }],
      security: ["BT1-009"],
    },
  });
  await s.ready();
  await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("shine"));
  expect(s.perm("target").currentDP).toBe(10000);
  expect(observe(s.engine).securityDp(1)).toBe(0);
});

it("allows the alternate evolution from a level 5 RizeGreymon", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT12-042", as: "rize" }],
        hand: [{ card: "BT12-043", as: "shine" }],
      },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 3;
  await advance(s.engine).verb.digivolveFromInstance(s.perm("rize").permanentId, s.inst("shine").instanceId);
  await settle(() => s.perm("rize").topCard?.cardId === "BT12-043");
  expect(s.perm("rize").topCard?.cardId).toBe("BT12-043");
});
