import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT10/BT10-042.js";
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
              duration: "untilOpponentTurnEnd",
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
    await settle(() => s.perm("stack").currentDP === 11000);
    expect(s.perm("stack").currentDP).toBe(11000);
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
        hand: [{ card: "BT9-015", as: "evolving" }],
        trash: [{ card: "BT9-109", as: "lateX" }],
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
    await advance(s.engine).verb.placeUnder(s.perm("base").permanentId, [s.inst("lateX").instanceId]);
    expect(s.perm("base").currentDP).toBe(8000);
  });
});
