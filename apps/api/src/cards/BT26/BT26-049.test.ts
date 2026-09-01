import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled } from "./BT26-049.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT26-049 Rosemon", () => {
  it("encodes the shared suspend budget and both All Turns reaction routes", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Lilamon"], cost: 3, isAlternate: true },
      { level: 5, traits: ["DATA SQUAD"], cost: 3, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor("BT26-049")).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "bt26-049-suspend",
      actions: [{ kind: "Suspend", target: { count: 2 } }],
    });
    expect(irNode(compiled.effects?.[0]?.actions?.[0])?.target).not.toHaveProperty("upTo");
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", sharedUseKey: "bt26-049-suspend" });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          optional: true,
          actions: [
            {
              kind: "Modal",
              choose: 1,
              options: [
                [
                  {
                    kind: "PlayWithoutCost",
                    playCostCeiling: {
                      base: 3,
                      raise: 1,
                      per: 1,
                      unit: "cards",
                      filter: { controller: "any", suspended: true },
                    },
                  },
                ],
                [
                  {
                    kind: "UseOptionWithoutCost",
                    playCostCeiling: {
                      base: 3,
                      raise: 1,
                      per: 1,
                      unit: "cards",
                      filter: { controller: "any", suspended: true },
                    },
                  },
                ],
              ],
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          optional: true,
          actions: [{ kind: "Modal", choose: 1 }],
        },
      ],
    });
    expect(
      irNode(compiled.effects?.[2]?.actions?.[0])?.actions?.[0]?.options?.[0]?.[0]?.target?.filter,
    ).not.toHaveProperty("playCostLte");
  });

  it("uses an Option after one own and one opposing suspension raise the DATA SQUAD ceiling to five", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-049", as: "rosemon", suspended: true }],
          hand: [{ card: "BT26-098", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT1-086", as: "opponentTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opponentTamer").permanentId], 0);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("does not use a cost-5 Option when only one suspended card raises the ceiling to four", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-049", as: "rosemon" }], hand: [{ card: "BT26-098", as: "option" }] },
        1: { battleArea: [{ card: "BT1-086", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opponentTamer").permanentId], 0);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not consume the All Turns once-per-turn use when its optional activation is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-049", as: "rosemon", suspended: true }],
          hand: [{ card: "BT26-098", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-085", as: "first" },
            { card: "BT1-086", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();

    const firstSuspension = advance(s.engine).verb.suspend([s.perm("first").permanentId], 0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firstSuspension;
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);

    const secondSuspension = advance(s.engine).verb.suspend([s.perm("second").permanentId], 0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await secondSuspension;

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  it("plays at the raised cost ceiling and shares the All Turns budget with the Tamer-trash route", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-049", as: "rosemon", suspended: true },
            {
              card: "BT1-085",
              as: "stackedTamer",
              under: [{ card: "BT1-010", as: "underTamer", faceUp: false }],
            },
          ],
          hand: [
            { card: "BT26-039", as: "costFive" },
            { card: "BT26-094", as: "secondDataSquad" },
          ],
        },
        1: { battleArea: [{ card: "BT1-086", as: "opponentTamer" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        preferOptionIndex: 0,
      },
    );
    preferred.push(s.inst("costFive").instanceId, s.inst("secondDataSquad").instanceId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opponentTamer").permanentId], 0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-039")).toBe(true);

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("stackedTamer").permanentId,
      [s.inst("underTamer").instanceId],
      0,
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondDataSquad").instanceId);
  });

  it("plays a DATA SQUAD Digimon when an effect trashes under one of your Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-049", as: "rosemon", suspended: true },
            {
              card: "BT1-085",
              as: "stackedTamer",
              under: [{ card: "BT1-010", as: "underTamer", faceUp: false }],
            },
          ],
          hand: [{ card: "BT26-039", as: "dataSquadDigimon" }],
        },
        1: { battleArea: [{ card: "BT1-086", as: "suspendedOpponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("stackedTamer").permanentId,
      [s.inst("underTamer").instanceId],
      0,
    );

    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-039"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("underTamer").instanceId);
  });

  it("shares the mandatory suspend-2 once-per-turn use between digivolving and attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-049", as: "rosemon" }] },
        1: {
          battleArea: [
            { card: "BT1-085", as: "first" },
            { card: "BT1-086", as: "second" },
            { card: "BT1-087", as: "third" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("rosemon"));
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.perm("third").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rosemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("third").isSuspended).toBe(false);
  });
});
