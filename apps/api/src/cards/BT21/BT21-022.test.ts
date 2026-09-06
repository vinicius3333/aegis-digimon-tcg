import { CardKind, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-022.js";
import "../index.js";

describe("BT21-022 Canoweissmon", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("places a Gammamon-text Digimon as bottom material for either removal trigger and saves once from an opponent effect", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } },
                count: 1,
              },
              cost: {
                kind: "place",
                target: {
                  filter: {
                    zone: "hand",
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
                  },
                  count: 1,
                  from: ["hand"],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: "self",
                raw: "By placing 1 Digimon card with [Gammamon] in its text from your hand as this Digimon's bottom digivolution card",
              },
              optional: true,
              allowCostWithoutTarget: true,
              abortOnDecline: true,
            },
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            mode: "prevent",
            leaveCause: "byOpponentEffect",
            optional: true,
            sourceFilter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
            },
            cost: {
              kind: "trash",
              target: {
                filter: { zone: "digivolutionCards", isSelfRef: true, kind: ["Digimon"] },
                count: 3,
                from: ["digivolutionCards"],
              },
              raw: "by trashing 3 Digimon cards from its digivolution cards",
            },
          },
        ],
      }),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Gammamon"], cost: 3, isAlternate: true }]);
  });

  it("pays the Gammamon-text hand cost, places it at the bottom, and deletes exactly a 7000 DP target", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-022", as: "canoweissmon" },
            { card: "BT21-019", as: "material" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 7000 },
            { card: "BT1-010", as: "high", dp: 8000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("canoweissmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    const canoweissmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-022")!;
    expect(canoweissmon.stack[0]?.instanceId).toBe(s.inst("material").instanceId);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("high").permanentId);
    expect(s.state.memory).toBe(3);
  });

  it("publicly uses the alternate Gammamon-text Lv4 route and still pays placement with no deletion target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-002", as: "host" }],
          hand: [
            { card: "BT21-010", as: "lv3" },
            { card: "BT21-019", as: "lv4" },
            { card: "BT21-022", as: "canoweissmon" },
            { card: "BT21-019", as: "material" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "ineligible", dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    for (const alias of ["lv3", "lv4"] as const) {
      expect(
        s.engine.applyIntent(0, { type: "digivolve", permanentId: hostId, instanceId: s.inst(alias).instanceId }),
      ).toEqual({
        ok: true,
      });
      await settle(() => s.perm("host").topCard.instanceId === s.inst(alias).instanceId);
    }
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: s.inst("canoweissmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("canoweissmon").instanceId);

    expect(s.perm("host").stack[0]?.instanceId).toBe(s.inst("material").instanceId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010")).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("rejects the alternate evolution when the Lv4 has no Gammamon text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-015", as: "host" }],
        hand: [
          { card: "BT21-022", as: "canoweissmon" },
          { card: "BT1-009", as: "nonMatch" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("canoweissmon").instanceId,
      alternateRequirementIndex: 0,
    });
    expect(result.ok).toBe(false);
    expect(s.perm("host").topCard.cardId).toBe("BT21-015");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("canoweissmon").instanceId,
      s.inst("nonMatch").instanceId,
    ]);
  });

  it("does not pay with a nonmatching card and permits declining the placement cost", async () => {
    for (const [material, options] of [
      ["BT1-009", { autoAcceptOptional: true, autoSelectCards: true }],
      ["BT21-019", { autoDeclineOptional: true }],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT21-022", as: "canoweissmon" },
              { card: material, as: "material" },
            ],
          },
          1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
        },
        options,
      );
      s.state.memory = 10;
      await s.ready();
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("canoweissmon").instanceId });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-022"));
      expect(s.state.players[1]!.battleArea).toHaveLength(1);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("material").instanceId);
    }
  });

  it("prevents one opponent-effect deletion only after trashing exactly 3 Digimon sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "AD1-007",
              as: "host",
              under: [
                { card: "BT1-009", as: "cost1" },
                { card: "BT1-010", as: "cost2" },
                { card: "BT1-011", as: "cost3" },
                { card: "BT21-022", as: "inherited" },
              ],
            },
          ],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("cost1").instanceId, s.inst("cost2").instanceId, s.inst("cost3").instanceId]),
    );
    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
  });

  it("naturally proves once-per-turn prevention with two public Gaia Force deletions", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-019", as: "host", under: [{ card: "BT21-010", as: "source1" }] }],
          hand: [
            { card: "BT21-022", as: "canoweissmon" },
            { card: "BT21-028", as: "siriusmon" },
            { card: "BT21-019", as: "material1" },
            { card: "BT21-010", as: "material2" },
            { card: "BT21-028", as: "material3" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim1" },
            { card: "BT1-010", as: "victim2" },
            { card: "BT21-019", as: "victim3" },
            { card: "BT1-085", as: "redTamer" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          hand: [
            { card: "ST1-16", as: "gaiaForce" },
            { card: "ST1-16", as: "gaiaForce2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("source1").instanceId, s.inst("material1").instanceId, s.inst("material2").instanceId);
    s.state.memory = 20;
    const hostId = s.perm("host").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: s.inst("canoweissmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("canoweissmon").instanceId);
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: hostId, instanceId: s.inst("siriusmon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("siriusmon").instanceId);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.length >= 5);
    expect(
      s.perm("host").stack.filter((card) => getCardDefinition(card.cardId)?.kinds.includes(CardKind.Digimon)).length,
    ).toBeGreaterThanOrEqual(6);
    s.state.memory = 20;
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT21-022");
    expect(
      s.perm("host").stack.filter((card) => getCardDefinition(card.cardId)?.kinds.includes(CardKind.Digimon)).length,
    ).toBeGreaterThanOrEqual(3);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
  });
});
