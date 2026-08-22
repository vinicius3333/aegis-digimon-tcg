import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-009.js";
import "../index.js";

describe("BT26-009 Hyokomon", () => {
  it("compiles both printed clauses with complete coverage", () => {
    expect(compiled).toMatchObject({ coverage: "full", effects: [{ trigger: "StartOfYourMainPhase" }, { trigger: "WhenAttacking", isInherited: true }] });
  });
  it("uses the exact off-color Lv.2 [TS] cost-0 evolution path and rejects a near-match", () => {
    expect(digivolutionRequirementsFor("BT26-009")).toContainEqual({
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    });

    const legal = setupEngine({
      0: {
        breeding: { card: "BT26-001", as: "tsEgg" },
        hand: [{ card: "BT26-009", as: "hyokomon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsEgg").permanentId,
        instanceId: legal.inst("hyokomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });

    const illegal = setupEngine({
      0: {
        breeding: { card: "BT21-005", as: "plainEgg" },
        hand: [{ card: "BT26-009", as: "hyokomon" }],
      },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plainEgg").permanentId,
        instanceId: illegal.inst("hyokomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("pays the start-main hand-trash cost, then draws and gains 1 memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-009", as: "hyokomon" }],
          hand: [
            { card: "BT26-016", as: "chronomon" },
            { card: "BT1-009", as: "unrelated" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("chronomon").instanceId);

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hyokomon"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("chronomon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("unrelated").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("inherited attack draws first, then at exactly 6 returns one hand card face-down to deck bottom", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-014", as: "host", under: [{ card: "BT26-009" }] }],
          hand: [{ card: "BT1-009", as: "bottom" }, "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: [{ card: "BT1-014", as: "drawn" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("bottom").instanceId);

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.deck.at(-1)?.faceUp).toBe(false);
  });

  it("inherited attack stops after drawing when the post-draw hand has only 5 cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-014", as: "host", under: [{ card: "BT26-009" }] },
          { card: "BT1-009", as: "ally" },
        ],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        deck: [{ card: "BT1-005", as: "drawn" }],
      },
    });
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("ally"), {
      attackerPermanentId: s.perm("ally").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.deck).toHaveLength(1);

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

});
