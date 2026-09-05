import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-009.js";
import "../index.js";

describe("EX4-009 RizeGreymon", () => {
  it("has the official identity and reduces one Digimon plus all Security Digimon", () => {
    expect(getCardDefinition("EX4-009")).toMatchObject({
      cardId: "EX4-009",
      nameEn: "RizeGreymon",
      colors: ["Red", "Yellow"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toEqual([
      expect.objectContaining({
        kind: "ModifyDP",
        amount: -4000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      }),
      expect.objectContaining({
        kind: "ModifySecurityDP",
        controller: "opponent",
        amount: -4000,
        duration: "forTheTurn",
      }),
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["GeoGreymon"], cost: 3, isAlternate: true }]);
  });

  it.each([
    ["red level 4", "EX4-008", false, 0],
    ["yellow level 4", "BT1-051", false, 0],
    ["GeoGreymon", "EX4-007", true, 1],
  ])("digivolves through the printed %s route", async (_route, baseCard, useAlternateCost, expectedMemory) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-009", as: "rizeGreymon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rizeGreymon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-009");

    expect(s.state.memory).toBe(expectedMemory);
  });
  it("inherits the same pair after a red or yellow Tamer is suspended", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
        },
      ],
    });
  });

  it("reduces one opposing Digimon and the opponent's security Digimon DP on digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-009", as: "rize" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 9000 },
            { card: "BT1-010", as: "other", dp: 9000 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("rize"));

    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.perm("other").currentDP).toBe(9000);
    expect(observe(s.engine).securityDp(1)).toBe(-4000);
  });

  it("Q3445 still reduces opposing Security Digimon when no field Digimon exists", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-009", as: "rize" }] },
      1: { security: ["BT1-009"] },
    });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("rize"));

    expect(observe(s.engine).securityDp(1)).toBe(-4000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits the same reduction once per turn when an allied yellow Tamer suspends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-009", as: "host", under: ["EX4-009"] },
            { card: "AD1-019", as: "yellowTamer" },
            { card: "BT1-085", as: "redTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }], security: ["BT1-009"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("yellowTamer").permanentId]);
    await settle(() => s.perm("target").currentDP === 8000);
    expect(observe(s.engine).securityDp(1)).toBe(-4000);

    await advance(s.engine).verb.suspend([s.perm("redTamer").permanentId]);
    await settle();
    expect(s.perm("target").currentDP).toBe(8000);
    expect(observe(s.engine).securityDp(1)).toBe(-4000);
  });
});
