import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { toDuration } from "../../engine/effects/interpreter/duration.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT10/BT10-042.js";
import "../BT1/BT1-015.js";
import "./BT9-109.js";
import { compiled } from "./BT9-015.js";
describe("BT9-015 MetalGreymon (X Antibody)", () => {
  it("matches the complete catalog, timed grants, condition, and evolution IR", () => {
    expect(getCardDefinition("BT9-015")).toMatchObject({
      cardId: "BT9-015",
      nameEn: "MetalGreymon (X Antibody)",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "SecurityAttack", amount: 1 },
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "ModifyDP",
              amount: 3000,
              duration: "untilOpponentNextTurnEnd",
              condition: {
                kind: "selfHasInDigivolutionCards",
                nameOrTrait: [{ tokens: ["MetalGreymon", "X Antibody"], match: "nameExact" }],
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["MetalGreymon"], cost: 0, isAlternate: true }],
    });
    const dpAction = compiled.effects[0]!.actions[1]!;
    expect(dpAction).not.toHaveProperty("playerWide");
    expect(dpAction).not.toHaveProperty("alsoGainKeywords");
    expect(dpAction).not.toHaveProperty("continuous");
    expect(dpAction).toMatchObject({ target: { count: 1 } });
    expect(dpAction).not.toHaveProperty("target.sameTarget");
    expect(dpAction).not.toHaveProperty("target.totalDpCap");
    expect(dpAction).not.toHaveProperty("target.totalPlayCostBudget");
    expect(dpAction).not.toHaveProperty("target.totalLevels");
    expect(() => toDuration("untilOpponentNextTurnEnd")).toThrow(/single-target ModifyDP/);
  });

  it("uses the 0-cost MetalGreymon route on a complete legal stack and resolves before Venusmon suppresses later effects (Q1967)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "stack" },
        hand: [
          { card: "BT9-008", as: "agumon" },
          { card: "BT1-015", as: "greymon" },
          { card: "BT1-021", as: "metalGreymon" },
          { card: "BT9-015", as: "metalGreymonX" },
        ],
      },
      1: { battleArea: [{ card: "BT10-042", as: "venusmon" }] },
    });
    s.state.memory = 5;
    for (const alias of ["agumon", "greymon", "metalGreymon"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("stack").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("stack").topCard.instanceId === s.inst(alias).instanceId);
    }
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("stack").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined);
    s.state.phase = Phase.Main;
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stack").permanentId,
        instanceId: s.inst("metalGreymonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    // Greymon contributes its inherited +2000 DP on top of the +3000 grant.
    await settle(() => s.perm("stack").currentDP === 13000);
    expect(s.perm("stack").currentDP).toBe(13000);
    expect(s.state.memory).toBe(1);
  });
  it("gains Security Attack +1 and 3000 DP over MetalGreymon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "base" }], hand: [{ card: "BT9-015", as: "evolving" }] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 11000);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack")).toBe(true);
  });

  it("gains Security Attack +1 but not DP over an unrelated red level 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-017", as: "base" }],
        hand: [{ card: "BT9-015", as: "evolving" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack"));

    expect(s.perm("base").currentDP).toBe(8000);
    expect(s.state.memory).toBe(0);
  });

  it("separates current-opponent-turn Security Attack expiry from next-opponent-turn DP expiry", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-015", as: "host", under: ["BT1-021"] }],
        hand: ["BT1-010"],
        deck: ["BT1-001"],
      },
      1: { hand: ["BT1-010"], deck: ["BT1-002"] },
    });
    s.state.turnSeat = 1;
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const closeTurn = async (seat: 0 | 1): Promise<void> => {
      const turn = s.engine.runOneTurn();
      await settle(() => mainPhase.isOpen && s.state.turnSeat === seat && s.state.phase === Phase.Main);
      expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      await turn;
    };

    // No player intent can digivolve during an ordinary opposing Main phase. Fire the
    // production timing directly inside the real opponent turn to model an effect-driven evolution.
    const currentOpponentTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 1 && s.state.phase === Phase.Main);
    s.state.memory = 10;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(true);
    expect(s.perm("host").currentDP).toBe(11000);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await currentOpponentTurn;
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(false);
    expect(s.perm("host").currentDP).toBe(11000);

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await closeTurn(0);
    expect(s.perm("host").currentDP).toBe(11000);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await closeTurn(1);
    expect(s.perm("host").currentDP).toBe(8000);
  });

  it("does not mistake an X Antibody trait for the [X Antibody] card name (Q1808)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-017", as: "base", under: ["BT7-056"] }],
        hand: [{ card: "BT9-015", as: "evolving" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack"));

    expect(s.perm("base").currentDP).toBe(8000);
  });

  it("does not mistake MetalGreymon (X Antibody) for the exact [MetalGreymon] or [X Antibody] card name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-017", as: "base", under: ["BT9-015"] }],
        hand: [{ card: "BT9-015", as: "evolving" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack"));

    expect(s.perm("base").currentDP).toBe(8000);
  });

  it("accepts the exact X Antibody card-name branch", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-017", as: "base", under: ["BT9-109"] }],
        hand: [{ card: "BT9-015", as: "evolving" }],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 11000);
    expect(s.perm("base").currentDP).toBe(11000);
  });

  it("implements Q1809 by not granting DP when X Antibody is placed after effect activation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-017", as: "base" }],
        hand: [
          { card: "BT9-015", as: "evolving" },
          { card: "BT9-109", as: "lateX" },
        ],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack"));
    expect(s.perm("base").currentDP).toBe(8000);
    s.state.memory = 1;
    const lateXId = s.inst("lateX").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: lateXId })).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some(({ instanceId }) => instanceId === lateXId));
    expect(s.perm("base").currentDP).toBe(8000);
  });
});
