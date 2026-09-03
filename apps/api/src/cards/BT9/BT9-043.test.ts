import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT9-043.js";
describe("BT9-043 Magnadramon (X Antibody)", () => {
  it("matches catalog, Q1836 exact-name condition, and end-attack cost IR", () => {
    expect(getCardDefinition("BT9-043")).toMatchObject({
      cardId: "BT9-043",
      nameEn: "Magnadramon (X Antibody)",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Dragon", "Four Great Dragons", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Magnadramon"], cost: 1, isAlternate: true }],
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            { kind: "ModifyDP", amount: -1000, target: { count: "all" }, scaling: { unit: "security" } },
            { kind: "ModifySecurityDP", amount: -1000, scaling: { unit: "security" } },
          ],
        },
        {
          trigger: "EndOfAttack",
          frequency: "OncePerTurn",
          actions: [{ kind: "Unsuspend", optional: true, cost: { kind: "securityToHand", count: 1, position: "top" } }],
        },
      ],
    });
  });

  it("reduces each opposing Digimon by 1000 DP per security card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-039", as: "base" }], hand: [{ card: "BT9-043", as: "evolving" }], security: 3 },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000 && observe(s.engine).securityDp(1) === -3000);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
  });

  it("does not treat Magnadramon (X Antibody) as either exact enabling card name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-057", as: "base", under: ["BT9-043"] }],
        hand: [{ card: "BT9-043", as: "evolving" }],
        security: 3,
      },
      1: { battleArea: [{ card: "BT2-047", as: "target" }] },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);
    await settle();

    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
    expect(observe(s.engine).securityDp(1)).toBe(0);
  });
});
