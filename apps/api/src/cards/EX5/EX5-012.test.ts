import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-012.js";
import "../index.js";
import {
  wouldBePlayedSelfReducersFor,
  wouldDigivolveSelfReducersFor,
} from "../../engine/effects/interpreter/registration/reducers.js";

describe("EX5-012 Flaremon", () => {
  it("matches the catalog and has complete IR coverage", () => {
    expect(getCardDefinition("EX5-012")).toMatchObject({
      cardId: "EX5-012",
      nameEn: "Flaremon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 3 },
        { color: "Blue", level: 4, memoryCost: 3 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Beastkin", "Light Fang"],
      effectText: expect.stringContaining("reduce the play or digivolution cost by 2"),
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("reduces play and digivolution cost by two only when a qualifying stacked Digimon exists", () => {
    const staticEffects = compiled.effects?.filter((entry) => entry.trigger === "Static");
    expect(staticEffects).toHaveLength(2);
    expect(staticEffects?.[0]?.actions).toMatchObject([
      {
        kind: "Replacement",
        event: "wouldBePlayed",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            mode: "reduceCost",
            amount: 2,
            condition: { kind: "youHave", filter: { digivolutionCardsAtLeast: 3 } },
          },
        ],
      },
    ]);
    expect(staticEffects?.[1]?.actions).toMatchObject([
      {
        kind: "Replacement",
        event: "wouldDigivolve",
        actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 2 }],
      },
    ]);
  });
  it("registers only self-scoped play and digivolve-into reductions for the pay-time collectors", () => {
    expect(wouldBePlayedSelfReducersFor("EX5-012")).toContainEqual(expect.objectContaining({ amount: 2 }));
    expect(wouldDigivolveSelfReducersFor("EX5-012")).toContainEqual(
      expect.objectContaining({ amount: 2, condition: expect.objectContaining({ kind: "youHave" }) }),
    );
  });
  it("deletes an opposing Digimon at 5000 DP or less on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 5000 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 5000 } } },
    });
  });

  it("deletes exactly 5000 DP on play while preserving a 5001 DP Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-012", as: "flaremon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atBoundary", dp: 5000 },
            { card: "BT1-013", as: "aboveBoundary", dp: 5001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;
    const atBoundaryId = s.perm("atBoundary").permanentId;
    const aboveBoundaryId = s.perm("aboveBoundary").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flaremon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === atBoundaryId), 500);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === atBoundaryId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === aboveBoundaryId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes exactly 5000 DP on digivolving while preserving a 5001 DP Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-008", as: "base" }],
          hand: [{ card: "EX5-012", as: "flaremon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atBoundary", dp: 5000 },
            { card: "BT1-013", as: "aboveBoundary", dp: 5001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const atBoundaryId = s.perm("atBoundary").permanentId;
    const aboveBoundaryId = s.perm("aboveBoundary").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("flaremon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === atBoundaryId), 500);
    expect(s.perm("base").topCard?.cardId).toBe("EX5-012");
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === atBoundaryId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === aboveBoundaryId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("grants itself 2000 DP during its controller's turn when inherited", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { filter: { isSelfRef: true } } }],
    });
  });

  it("reduces play cost by two for each allowed trait with exactly three sources", async () => {
    const cases = [
      { label: "Light Fang", support: "EX5-008" },
      { label: "Night Claw", support: "EX5-017" },
      { label: "Galaxy", support: "EX5-073" },
    ];
    for (const scenario of cases) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: scenario.support, as: "support", under: ["BT1-009", "BT1-010", "BT1-011"] }],
          hand: [{ card: "EX5-012", as: "flaremon" }],
        },
      });
      await s.ready();
      s.state.memory = 7;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flaremon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-012"), 500);
      expect(s.state.memory).toBe(2);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("flaremon").instanceId)).toBe(false);
    }
  });

  it("does not reduce play cost with fewer than three cards, a non-matching trait, or an opponent's stack", async () => {
    const cases: Array<{ label: string; board: SeatSpec; opponent?: SeatSpec }> = [
      {
        label: "two sources",
        board: { battleArea: [{ card: "EX5-008", as: "support", under: ["BT1-009", "BT1-010"] }] },
      },
      {
        label: "non-matching trait",
        board: { battleArea: [{ card: "BT1-009", as: "support", under: ["BT1-010", "BT1-011", "BT1-012"] }] },
      },
      {
        label: "opponent source",
        board: {},
        opponent: { battleArea: [{ card: "EX5-008", under: ["BT1-009", "BT1-010", "BT1-011"] }] },
      },
    ];
    for (const scenario of cases) {
      const s = setupEngine({
        0: { ...scenario.board, hand: [{ card: "EX5-012", as: "flaremon" }] },
        ...(scenario.opponent === undefined ? {} : { 1: scenario.opponent }),
      });
      await s.ready();
      s.state.memory = 7;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flaremon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-012"), 500);
      expect(s.state.memory).toBe(0);
    }
  });

  it("reduces digivolution cost by two only when the qualifying stack exists", async () => {
    const eligible = setupEngine({
      0: {
        battleArea: [{ card: "EX5-008", as: "base", under: ["BT1-009", "BT1-010", "BT1-011"] }],
        hand: [{ card: "EX5-012", as: "flaremon" }],
      },
    });
    await eligible.ready();
    eligible.state.memory = 3;
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("base").permanentId,
        instanceId: eligible.inst("flaremon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("base").topCard?.cardId === "EX5-012", 500);
    expect(eligible.state.memory).toBe(2);

    const ineligible = setupEngine({
      0: {
        battleArea: [{ card: "EX5-008", as: "base" }],
        hand: [{ card: "EX5-012", as: "flaremon" }],
      },
    });
    await ineligible.ready();
    ineligible.state.memory = 3;
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("base").permanentId,
        instanceId: ineligible.inst("flaremon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => ineligible.perm("base").topCard?.cardId === "EX5-012", 500);
    expect(ineligible.state.memory).toBe(0);
  });

  it("takes both printed level-4 color routes into Flaremon at the reduced cost", async () => {
    const cases = [
      { source: "EX5-008", label: "red" },
      { source: "EX5-017", label: "blue" },
    ] as const;
    for (const scenario of cases) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: scenario.source, as: "base", under: ["BT1-009", "BT1-010", "BT1-011"] }],
          hand: [{ card: "EX5-012", as: "flaremon" }],
        },
      });
      await s.ready();
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("flaremon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "EX5-012", 500);
      expect(s.state.memory).toBe(2);
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([
        "BT1-009",
        "BT1-010",
        "BT1-011",
        scenario.source,
      ]);
    }
  });

  it("does not apply Flaremon's reduction when digivolving from Flaremon (Q3549)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-012", as: "flaremon", under: ["BT1-009", "BT1-010", "BT1-011"] }],
        hand: [{ card: "EX5-013", as: "next" }],
      },
    });
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("flaremon").permanentId,
        instanceId: s.inst("next").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("flaremon").topCard?.cardId === "EX5-013", 500);
    expect(s.state.memory).toBe(0);
    expect(s.perm("flaremon").stack.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011", "EX5-012"]);
  });

  it("rejects an illegal level source without charging memory or moving the card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "EX5-012", as: "flaremon" }] },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("flaremon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("flaremon").instanceId }),
    );
  });

  it("applies the inherited DP bonus only during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-008", as: "boosted", under: ["EX5-012"] },
          { card: "BT1-009", as: "plain", under: ["EX5-012"] },
        ],
      },
    });
    await s.ready();
    expect(s.perm("boosted").currentDP).toBe(6000);
    expect(s.perm("plain").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("boosted").currentDP).toBe(4000);
    expect(s.perm("plain").currentDP).toBe(3000);
  });
});
