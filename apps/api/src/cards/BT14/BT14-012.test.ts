import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-012.js";

describe("BT14-012", () => {
  it("gains +2000 DP and memory when attacking with Tai Kamiya", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      actions: [
        { kind: "ModifyDP", amount: 2000 },
        { kind: "GainMemory", amount: 1, condition: { kind: "youHave" } },
      ],
    }));
  it("inherits conditional +2000 DP for Greymon or Omnimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 2000 }, while: { kind: "selfHasNameContaining" } }],
    }));

  it("gets +2000 DP and gains memory when attacking with Tai Kamiya present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT14-012", as: "greymon" },
          { card: "BT1-085", as: "tai" },
        ],
      },
      1: { security: ["BT1-001"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 5;
    const greymon = s.perm("greymon");
    const before = greymon.currentDP;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: greymon.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => greymon.currentDP === before + 2000 && s.state.memory === 6);
    expect(greymon.currentDP).toBe(before + 2000);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });

  it("still gains attack DP but no memory without Tai Kamiya", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-012", as: "greymon" }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 5;
    const before = s.perm("greymon").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("greymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greymon").currentDP === before + 2000);
    expect(s.perm("greymon").currentDP).toBe(before + 2000);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });

  it("uses the Agumon alternate path and grants inherited DP in a Greymon stack", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT14-007", as: "agumon", under: ["BT14-001"] },
          hand: [
            { card: "BT14-012", as: "greymon" },
            { card: "BT14-014", as: "metalGreymon" },
          ],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT14-031", as: "deleteTarget" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("greymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "BT14-012");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("metalGreymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "BT14-014");
    expect(s.perm("agumon").stack.map((card) => card.cardId)).toEqual(["BT14-001", "BT14-007", "BT14-012"]);

    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("agumon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("agumon").inBreeding);
    s.state.phase = Phase.Main;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("agumon").currentDP).toBe(12000);
    assertNoLoudGap(s);
  });
});
