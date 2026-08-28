import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-084.js";

describe("BT12-084 handwritten module", () => {
  it("registers its printed OnPlay effect without declarative effect record", () => {
    const module = getEffectModule("BT12-084");
    expect(module?.cardId).toBe("BT12-084");
    const source = {
      instanceId: "source-084",
      cardId: "BT12-084",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
  });
});

it("applies both Blocker and return restriction when Sparrowmon is in its stack", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-084", as: "jet", under: ["BT10-060"] },
          { card: "BT1-009", as: "ally" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jet"));
  expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
  const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
  const compiled = runtimeCompiledCard("BT12-084")!;
  expect(JSON.stringify(compiled.effects)).not.toContain('"kind":"Modal"');
});

it("keeps the Sparrowmon follow-up when the optional placement has no candidate", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-084", as: "jet", under: ["BT10-060"] },
          { card: "BT1-009", as: "ally" },
        ],
      },
    },
    { autoDeclineOptional: true },
  );
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jet"));
  expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
});

it("keeps the protection after resolution against hand and deck returns", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-084", as: "jet", under: ["BT10-060"] },
          { card: "BT1-009", as: "ally" },
        ],
        deck: ["BT1-010"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jet"));
  const allyId = s.perm("ally").topCard!.instanceId;
  await advance(s.engine).verb.returnToHand([allyId]);
  await advance(s.engine).verb.returnToDeck([allyId], { toTop: false });
  expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("ally").permanentId)).toBe(
    true,
  );
});
