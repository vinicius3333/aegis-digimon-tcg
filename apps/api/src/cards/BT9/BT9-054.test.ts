import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT9-054.js";

describe("BT9-054 Fujinmon", () => {
  it("matches catalog and complete hand, evolution, and inherited IR contract", () => {
    expect(getCardDefinition("BT9-054")).toMatchObject({
      cardId: "BT9-054",
      nameEn: "Fujinmon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 3 },
        { color: "Black", level: 5, memoryCost: 3 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          isFromHand: true,
          actions: [{ kind: "PlaceUnder", optional: true, cost: { kind: "payMemory", memory: 1 } }],
        },
        { trigger: "WhenDigivolving", actions: [{ kind: "Suspend", optional: true, cost: { kind: "trash" } }] },
        {
          trigger: "WhenAttacking",
          isInherited: true,
          actions: [
            { kind: "SelectBind", target: { bindAs: "suspendedTarget", filter: { dp: { op: "lte", value: 5000 } } } },
            { kind: "Suspend", target: { filter: {}, count: 1, fromSelectionRef: "suspendedTarget" } },
            {
              kind: "Restrict",
              target: { filter: {}, count: 1, fromSelectionRef: "suspendedTarget" },
              restriction: "unsuspend",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    });
  });

  it("trashes a Machine or Cyborg to suspend an opposing Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-060", as: "base" }],
          hand: [
            { card: "BT9-054", as: "evolving" },
            { card: "BT1-021", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("restricts the same opposing Digimon it suspends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-060", as: "host", under: [{ card: "BT9-054", as: "fujinmon" }] }] },
        1: {
          battleArea: [
            { card: "BT2-047", as: "low", dp: 5000 },
            { card: "BT1-010", as: "high", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("low").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("low"), "unsuspend")).toBe(true);
    expect(s.perm("high").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("high"), "unsuspend")).toBe(false);
  });
});
