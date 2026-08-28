import { describe, expect, it } from "vitest";
import { dnaDigivolutionRequirementsFor, requireCardDefinition } from "@aegis/shared";
import { canPayCost } from "../../engine/effects/interpreter/costs.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-073.js";

describe("EX5-073 GraceNovamon", () => {
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
        materials: [{ names: ["Apollomon"] }, { names: ["Dianamon"] }],
      },
    ]);
  });

  it("trashes up to eight evolution cards on DNA digivolving and deletes an opposing Digimon with no more cards than this Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "TrashDigivolution",
        amount: 8,
        condition: { kind: "isDnaDigivolving" },
        target: { count: "any", filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" } },
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
