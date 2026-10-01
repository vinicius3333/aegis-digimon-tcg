import { describe, expect, it } from "vitest";
import { dnaDigivolutionRequirementsFor, getCardDefinition, requireCardDefinition } from "@aegis/shared";
import { canPayCost } from "../../engine/effects/interpreter/costs.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-073.js";
import "../index.js";

describe("EX5-073 GraceNovamon", () => {
  it("matches the catalog contract", () => {
    expect(getCardDefinition("EX5-073")).toMatchObject({
      cardId: "EX5-073",
      nameEn: "GraceNovamon",
      colors: ["Red", "Blue"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Galaxy"],
      effectText: expect.stringContaining("DNA Digivolution: 0 from [Apollomon] + [Dianamon]"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
  it("has its printed Security Attack plus one and Blocker keywords", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
  });

  it("requires the printed zero-cost Apollomon plus Dianamon DNA route", () => {
    expect(dnaDigivolutionRequirementsFor("EX5-073")).toEqual([
      {
        cost: 0,
        materials: [{ namesExact: ["Apollomon"] }, { namesExact: ["Dianamon"] }],
      },
    ]);
    expect(compiled.dnaDigivolveRequirement).toEqual(dnaDigivolutionRequirementsFor("EX5-073"));
  });

  it("trashes up to eight evolution cards on DNA digivolving and deletes an opposing Digimon with no more cards than this Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "TrashDigivolution",
        amount: 8,
        scope: "acrossDigimon",
        condition: { kind: "isDnaDigivolving" },
        target: { count: "all", filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" } },
      },
      {
        kind: "Delete",
        target: {
          count: 1,
          filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsCompareToSource: "lte" },
        },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: {
        count: 1,
        filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsCompareToSource: "lte" },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).not.toHaveProperty(
      "condition",
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).not.toHaveProperty(
      "condition",
    );
  });
  it("prevents leaving play by trashing two same-level evolution cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "byOpponentEffect",
      actions: [
        {
          kind: "Prevent",
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: { count: 2, filter: { zone: "digivolutionCards", isSelfRef: true, sameLevelPair: true } },
          },
        },
      ],
    });
  });

  it("cannot pay its leave-play cost from another stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-073", as: "grace", under: ["BT1-010"] },
          { card: "BT1-024", as: "other", under: ["BT1-010", "BT1-011"] },
        ],
      },
    });
    await s.ready();
    const source = {
      instanceId: "grace-source",
      cardId: "EX5-073",
      ownerSeat: 0,
      definition: requireCardDefinition("EX5-073"),
      permanent: () => s.perm("grace"),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    };
    const ctx = {
      source,
      trigger: {},
      game: {
        state: s.state,
        player: (seat: 0 | 1) => s.state.players[seat]!,
        opponentOf: (seat: 0 | 1) => (seat === 0 ? 1 : 0),
        permanentById: (id: string) =>
          [...s.state.players[0]!.battleArea, ...s.state.players[1]!.battleArea].find((p) => p.permanentId === id),
        definitionOf: (card: { cardId: string }) => requireCardDefinition(card.cardId),
        linkMax: () => 1,
      },
      fx: {},
      ask: {},
      selections: new Map(),
    } as unknown as EffectContext;
    const replacement = compiled.effects!.find((effect) => effect.trigger === "AllTurns")!.actions[0]!;
    if (replacement.kind !== "Replacement" || replacement.actions?.[0]?.kind !== "Prevent")
      throw new Error("EX5-073 prevention missing");

    expect(canPayCost(ctx, replacement.actions[0].cost!)).toBe(false);
  });

  it("DNA digivolves for zero, trashes eight cards across opponent stacks, then deletes an eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-014", as: "apollo" },
            { card: "EX5-025", as: "diana" },
          ],
          hand: [{ card: "EX5-073", as: "grace" }],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "eligible", under: ["BT1-010", "BT1-011"] },
            {
              card: "BT1-024",
              as: "other",
              under: [
                "BT1-010",
                "BT1-011",
                "BT1-012",
                "BT1-013",
                "BT1-014",
                "BT1-010",
                "BT1-011",
                "BT1-012",
                "BT1-013",
                "BT1-014",
                "BT1-010",
                "BT1-011",
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("apollo").permanentId, s.perm("diana").permanentId],
        instanceId: s.inst("grace").instanceId,
      }),
    ).toEqual({ ok: true });
    const opponentBattle = s.state.players[1]!.battleArea;
    await settle(() => opponentBattle.length === 1 && s.state.players[1]!.trash.length >= 8);
    expect(opponentBattle).toHaveLength(1);
    expect(opponentBattle[0]!.topCard?.instanceId).toBe(s.inst("other").instanceId);
    expect(opponentBattle[0]!.stack).toHaveLength(6);
    expect(s.state.players[1]!.trash).toHaveLength(9);
  });

  it("rejects a wrong named DNA material through the public intent without consuming either source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-014", as: "apollo" },
          { card: "EX5-024", as: "wrongMate" },
        ],
        hand: [{ card: "EX5-073", as: "grace" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("apollo").permanentId, s.perm("wrongMate").permanentId],
        instanceId: s.inst("grace").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "EX5-014",
      "EX5-024",
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("grace").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes as many as possible when fewer than eight opponent sources exist", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-014", as: "apollo" },
            { card: "EX5-025", as: "diana" },
          ],
          hand: [{ card: "EX5-073", as: "grace" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target", under: ["BT1-010", "BT1-011"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("apollo").permanentId, s.perm("diana").permanentId],
        instanceId: s.inst("grace").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011", "BT1-024"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("prevents an opponent-effect deletion by trashing two same-level cards from its own stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-073", as: "grace", dp: 4000, under: ["BT1-010", "BT1-011"] }] },
        1: { hand: [{ card: "EX5-012", as: "deleter" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const graceId = s.perm("grace").permanentId;
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deleter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length >= 2);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === graceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-010", "BT1-011"]),
    );
  });

  it("still deletes an eligible opponent when attacking without DNA digivolving, per Q3687/Q3688", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-073", as: "grace", under: ["BT1-010", "BT1-011"] }] },
        1: { battleArea: [{ card: "BT1-024", as: "eligible" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const eligibleId = s.perm("eligible").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("grace").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === eligibleId), 2000);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === eligibleId)).toBe(false);
  });
});

describe("EX5-073 GraceNovamon — KB Q&A rulings", () => {
  async function dnaDigivolveAgainst(opponentBattleArea: PermanentSpec[]) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-014", as: "apollo" },
            { card: "EX5-025", as: "diana" },
          ],
          hand: [{ card: "EX5-073", as: "grace" }],
        },
        1: { battleArea: opponentBattleArea },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("apollo").permanentId, s.perm("diana").permanentId],
        instanceId: s.inst("grace").instanceId,
      }),
    ).toEqual({ ok: true });
    return s;
  }

  it("can split the 8 trashed digivolution cards across several opposing Digimon (Q3686)", async () => {
    const sources = (prefix: string) =>
      ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"].map((card, index) => ({
        card,
        as: `${prefix}${index}`,
      }));
    const s = await dnaDigivolveAgainst([
      { card: "BT1-024", as: "first", under: sources("firstSource") },
      { card: "BT1-024", as: "second", under: sources("secondSource") },
    ]);
    const trashedFrom = (prefix: string) =>
      [0, 1, 2, 3, 4].filter((index) =>
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst(`${prefix}${index}`).instanceId),
      ).length;
    await settle(
      () => trashedFrom("firstSource") + trashedFrom("secondSource") >= 8 && s.state.pendingDecision === undefined,
    );

    expect(trashedFrom("firstSource")).toBeGreaterThan(0);
    expect(trashedFrom("secondSource")).toBeGreaterThan(0);
    expect(s.decisions.some(({ req }) => req.options?.max === 8)).toBe(true);
  });

  it("trashes as many as possible when the opponent has fewer than 8 digivolution cards (Q3689)", async () => {
    const s = await dnaDigivolveAgainst([
      {
        card: "BT1-024",
        as: "target",
        under: [
          { card: "BT1-010", as: "sourceA" },
          { card: "BT1-011", as: "sourceB" },
        ],
      },
      { card: "BT1-024", as: "bare", under: [{ card: "BT1-012", as: "sourceC" }] },
    ]);
    await settle(
      () =>
        ["sourceA", "sourceB", "sourceC"].every((alias) =>
          s.state.players[1]!.trash.some((card) => card.instanceId === s.inst(alias).instanceId),
        ) && s.state.pendingDecision === undefined,
    );

    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.stack.length > 0)).toHaveLength(0);
  });
});
