import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import "../BT3/BT3-040.js";
import { compiled } from "./BT8-096.js";

describe("BT8-096 Top Gun", () => {
  it("keeps one-card multicolor stack semantics and the exclusive DP branches in executable IR", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            { kind: "Delete", condition: { kind: "anyOf" }, target: { filter: { dp: { op: "lte", value: 7000 } } } },
            {
              kind: "Delete",
              condition: { kind: "not", condition: { kind: "anyOf" } },
              target: { filter: { dp: { op: "lte", value: 4000 } } },
            },
          ],
        },
        {
          trigger: "Security",
          isSecurity: true,
          actions: [
            { kind: "Delete", condition: { kind: "anyOf" }, target: { filter: { dp: { op: "lte", value: 7000 } } } },
            {
              kind: "Delete",
              condition: { kind: "not", condition: { kind: "anyOf" } },
              target: { filter: { dp: { op: "lte", value: 4000 } } },
            },
          ],
        },
      ],
    });
  });

  it("offers only opposing Digimon at 4000 DP or less without a multicolor condition", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT8-007", "BT8-013"],
        hand: [{ card: "BT8-096", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "exact", dp: 4_000 },
          { card: "BT1-029", as: "above", dp: 4_001 },
        ],
      },
    });
    s.state.memory = 3;
    const exactId = s.perm("exact").permanentId;
    const aboveId = s.perm("above").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === exactId));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === aboveId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not combine differently colored monocolor digivolution cards for the 7000 DP cap", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-060", under: ["BT1-001", "BT17-019", "BT1-032"] }, "BT8-013"],
        hand: [{ card: "BT8-096", as: "option" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5_000 }] },
    });
    s.state.memory = 3;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-096"));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("raises the cap to exactly 7000 when one digivolution card is itself multicolor", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-084", under: ["BT8-046", "BT8-039"] }, "BT8-013"],
          hand: [{ card: "BT8-096", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "exact", dp: 7_000 },
            { card: "BT1-029", as: "above", dp: 7_001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const exactId = s.perm("exact").permanentId;
    const aboveId = s.perm("above").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === exactId));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === aboveId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not count a multicolor card under a Tamer toward the 7000 DP cap", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-090", under: ["BT11-094"] }, "BT8-013"],
        hand: [{ card: "BT8-096", as: "option" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5_000 }] },
    });
    s.state.memory = 3;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-096"));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("activates the 7000 DP Main effect from Security with a multicolor Digimon in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT8-015"],
        security: [{ card: "BT8-096", as: "securityOption", faceUp: true }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 7_000 }] },
    });
    const targetId = s.perm("target").permanentId;

    const resolution = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await resolution;

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("BT8-096 Top Gun — KB Q&A rulings", () => {
  async function targetSurvivesTopGun(ownBattleArea: (PermanentSpec | string)[]): Promise<boolean> {
    const s = setupEngine(
      {
        0: { battleArea: [...ownBattleArea, "BT8-013"], hand: [{ card: "BT8-096", as: "topGun" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5_000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("topGun").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-096"));
    assertNoLoudGap(s);
    return s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId);
  }

  it("does not count a Digimon whose red and blue digivolution cards are separate cards (Q1771)", async () => {
    expect(await targetSurvivesTopGun([{ card: "BT8-060", under: ["BT1-001", "BT17-019", "BT1-032"] }])).toBe(true);
    expect(await targetSurvivesTopGun([{ card: "BT8-060", under: ["BT1-001", "BT8-039"] }])).toBe(false);
  });

  it("does not count Shakkoumon's granted blue while it is a digivolution card (Q1772)", async () => {
    expect(await targetSurvivesTopGun([{ card: "BT1-020", under: ["BT3-040"] }])).toBe(true);
    expect(await targetSurvivesTopGun(["BT3-040"])).toBe(false);
  });
});
