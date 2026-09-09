import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-020.js";
import "../index.js";

describe("EX5-020 Crescemon", () => {
  it("matches the catalog and encodes every printed clause", () => {
    expect(getCardDefinition("EX5-020")).toMatchObject({
      cardId: "EX5-020",
      nameEn: "Crescemon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Blue", level: 4, memoryCost: 3 },
        { color: "Red", level: 4, memoryCost: 3 },
      ],
      types: ["Wizard", "Night Claw"],
      effectText: expect.stringContaining("reduce the play or digivolution cost by 2"),
      inheritedEffectText: "[Opponent's Turn] This Digimon gets +2000 DP.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const statics = compiled.effects?.filter((entry) => entry.trigger === "Static");
    expect(statics).toHaveLength(1);
    expect(statics?.[0]?.actions).toMatchObject([
      {
        kind: "Replacement",
        event: "wouldBePlayed",
        sourceFilter: { isSelfRef: true },
        actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 2 }],
      },
      {
        kind: "Replacement",
        event: "wouldDigivolve",
        actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 2 }],
      },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        {
          kind: "Restrict",
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ]);
    }
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { filter: { isSelfRef: true } } }],
    });
  });

  it("reduces public play cost and restricts exactly one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-017", as: "support", under: ["BT1-009", "BT1-010", "BT1-011"] }],
          hand: [{ card: "EX5-020", as: "crescemon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crescemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX5-020"));
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).isRestricted(s.perm("first"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("second"), "suspend")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("accepts every allowed support trait and the exact three-card boundary", async () => {
    for (const support of ["EX5-017", "EX5-008", "EX5-073"] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: support, as: "support", under: ["BT1-009", "BT1-010", "BT1-011"] }],
          hand: [{ card: "EX5-020", as: "crescemon" }],
        },
      });
      await s.ready();
      s.state.memory = 7;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crescemon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX5-020"));
      expect(s.state.memory).toBe(2);
    }

    const boundary = setupEngine({
      0: {
        battleArea: [{ card: "EX5-017", as: "support", under: ["BT1-009", "BT1-010"] }],
        hand: [{ card: "EX5-020", as: "crescemon" }],
      },
    });
    await boundary.ready();
    boundary.state.memory = 7;
    expect(
      boundary.engine.applyIntent(0, { type: "playCard", instanceId: boundary.inst("crescemon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => boundary.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX5-020"));
    expect(boundary.state.memory).toBe(0);
  });

  it("rejects non-matching or opponent-only support stacks", async () => {
    for (const scenario of [
      { board: { battleArea: [{ card: "BT1-009", as: "support", under: ["BT1-010", "BT1-011", "BT1-012"] }] } },
      {
        board: {},
        opponent: { battleArea: [{ card: "EX5-017", as: "support", under: ["BT1-009", "BT1-010", "BT1-011"] }] },
      },
    ] as const) {
      const s = setupEngine({
        0: { ...scenario.board, hand: [{ card: "EX5-020", as: "crescemon" }] },
        ...(scenario.opponent === undefined ? {} : { 1: scenario.opponent }),
      });
      await s.ready();
      s.state.memory = 7;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crescemon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX5-020"));
      expect(s.state.memory).toBe(0);
    }
  });

  it("reduces both printed blue and red public evolution routes", async () => {
    for (const source of ["EX5-017", "EX5-008"] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: source, as: "base", under: ["BT1-009", "BT1-010", "BT1-011"] }],
          hand: [{ card: "EX5-020", as: "crescemon" }],
        },
      });
      await s.ready();
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("crescemon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "EX5-020");
      expect(s.state.memory).toBe(2);
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011", source]);
      expect(s.state.pendingDecision).toBeUndefined();
    }
  });

  it("answers Q3569: the reduction does not apply when Crescemon is the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-020", as: "crescemon", under: ["EX5-017", "BT1-009", "BT1-010", "BT1-011"] }],
        hand: [{ card: "BT1-044", as: "next" }],
      },
    });
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("crescemon").permanentId,
        instanceId: s.inst("next").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("crescemon").topCard?.cardId === "BT1-044");
    expect(s.state.memory).toBe(3);
    expect(s.perm("crescemon").stack.map((card) => card.cardId)).toEqual([
      "EX5-017",
      "BT1-009",
      "BT1-010",
      "BT1-011",
      "EX5-020",
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects an illegal level source without charging memory or moving Crescemon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "wrongLevel" }], hand: [{ card: "EX5-020", as: "crescemon" }] },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongLevel").permanentId,
        instanceId: s.inst("crescemon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.perm("wrongLevel").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("crescemon").instanceId }),
    );
  });

  it("applies the inherited +2000 DP through the real opponent-turn loop", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-044", as: "host", under: ["EX5-020"] }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: { deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(11000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(13000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(11000);
    void loop;
  });
});
