import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX11-016 PolarBearmon", () => {
  it("encodes the alternate evolution, Iceclad, across-stack trash, security placement, and self-bound inheritance", () => {
    const compiled = runtimeCompiledCard("EX11-016")!;

    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Ice-Snow"], cost: 3, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "IceClad", raw: "＜Ice Clad＞" }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "TrashDigivolution",
            amount: 2,
            scope: "acrossDigimon",
            target: { count: "all", filter: { controller: "opponent", digivolutionCards: "hasAny" } },
          },
          {
            kind: "SecurityManipulation",
            op: "addTopOrBottom",
            controller: "opponent",
            optional: true,
            source: { filter: { controller: "opponent", digivolutionCards: "none" }, count: 1 },
          },
        ],
      });
    }
    const inherited = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(inherited.isInherited).toBe(true);
    expect(inherited.actions).toHaveLength(2);
    for (const action of inherited.actions ?? []) {
      expect(action).toMatchObject({
        kind: "Aura",
        target: { filter: { isSelfRef: true, kind: ["Digimon"] }, count: 1, isSelf: true },
        while: { kind: "opponentHasNone", filter: { digivolutionCards: "hasAny" } },
      });
    }
    expect(compiled.effects.some((effect) => effect.isSecurity)).toBe(false);
  });

  it("trashes any two cards across two opposing digivolution stacks", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX11-016", as: "polar" }] },
        1: {
          battleArea: [
            { card: "EX11-015", as: "first", under: ["EX11-014"] },
            { card: "BT1-009", as: "second", under: ["BT1-010"] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("polar").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 2);

    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it.each([
    { label: "top", optionIndex: 0, expectedIndex: 0 },
    { label: "bottom", optionIndex: 1, expectedIndex: 2 },
  ])("may place a newly source-free Digimon at the security $label", async ({ optionIndex, expectedIndex }) => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX11-016", as: "polar" }] },
        1: {
          battleArea: [{ card: "EX11-015", as: "victim", under: ["EX11-014"] }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: optionIndex },
    );
    const victimInstanceId = s.inst("victim").instanceId;
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("polar").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.some((card) => card.instanceId === victimInstanceId));

    expect(s.state.players[1]!.security[expectedIndex]?.instanceId).toBe(victimInstanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("resolves the same sequence when digivolving by the Ice-Snow route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-015", as: "base" }],
          hand: [{ card: "EX11-016", as: "polar" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", under: ["BT1-010", "BT1-011"] }],
          security: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    const victimInstanceId = s.inst("victim").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("polar").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.some((card) => card.instanceId === victimInstanceId));

    expect(s.perm("base").topCard.cardId).toBe("EX11-016");
    expect(s.state.players[1]!.security[0]?.instanceId).toBe(victimInstanceId);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("exposes Iceclad and wins a lower-DP battle by digivolution-card count", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-016", as: "polar", under: ["EX11-014", "EX11-015"] }] },
      1: { battleArea: [{ card: "EX11-017", as: "higherDp", suspended: true }] },
    });
    await s.ready();
    const defenderId = s.perm("higherDp").permanentId;

    expect(observe(s.engine).hasKeyword(s.perm("polar"), "IceClad")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("polar").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-016")).toBe(true);
    assertNoLoudGap(s);
  });

  it("grants Piercing and Security Attack +1 only to its own Ice-Snow host when no stacked opponent exists (Q6046)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX11-015", as: "host", under: ["EX11-016"] },
          { card: "EX11-015", as: "otherIceSnow" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasPierce(s.perm("otherIceSnow"))).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("otherIceSnow"), "SecurityAttack")).toBe(0);
  });

  it("withholds the inherited grants from a host without the Ice-Snow trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "nonIceSnowHost", under: ["EX11-016"] },
          { card: "EX11-015", as: "iceSnowHost", under: ["EX11-016"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("nonIceSnowHost"))).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("nonIceSnowHost"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).hasPierce(s.perm("iceSnowHost"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("iceSnowHost"), "SecurityAttack")).toBe(1);
  });

  it("withholds the inherited grants against a stacked opponent and outside the host's turn", async () => {
    const stackedOpponent = setupEngine({
      0: { battleArea: [{ card: "EX11-015", as: "host", under: ["EX11-016"] }] },
      1: { battleArea: [{ card: "BT1-009", under: ["BT1-010"] }] },
    });
    await stackedOpponent.ready();
    expect(observe(stackedOpponent.engine).hasPierce(stackedOpponent.perm("host"))).toBe(false);
    expect(observe(stackedOpponent.engine).keywordAmount(stackedOpponent.perm("host"), "SecurityAttack")).toBe(0);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "EX11-015", as: "host", under: ["EX11-016"] }] },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(observe(opponentTurn.engine).hasPierce(opponentTurn.perm("host"))).toBe(false);
    expect(observe(opponentTurn.engine).keywordAmount(opponentTurn.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("gains Piercing after deleting the last stacked opponent in battle and performs the checks (Q5802)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-015", as: "host", under: ["EX11-016"] }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "defender", suspended: true, under: ["BT1-010"] }],
        security: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    const defenderId = s.perm("defender").permanentId;
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    assertNoLoudGap(s);
  });

  it("supports normal blue/yellow cost 4 evolution and rejects an off-color level 4", async () => {
    async function assertNormalEvolution(baseCardId: string): Promise<void> {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX11-016", as: "polar" }] },
      });
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("polar").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX11-016");
      expect(s.state.memory).toBe(0);
    }

    await assertNormalEvolution("BT1-032");
    await assertNormalEvolution("BT1-055");

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "redBase" }], hand: [{ card: "EX11-016", as: "polar" }] },
    });
    invalid.state.memory = 4;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redBase").permanentId,
        instanceId: invalid.inst("polar").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
