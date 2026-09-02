import { describe, expect, it } from "vitest";
import {
  compiledEffects,
  digiXrosRequirementFor,
  digivolutionRequirementsFor,
  EffectTiming,
  getCardDefinition,
} from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX12-056.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-056 Cho-Hakkaimon", () => {
  it("maps the catalog, special evolution, DigiXros, Guard, Alliance attack, and inherited redirect clauses", () => {
    const card = getCardDefinition("EX12-056");

    expect(card?.effectText).toContain("＜Guard＞");
    expect(card?.effectText).toContain(
      "1 of your other [SW] trait Digimon may gain ＜Alliance＞ for the turn and attack",
    );
    expect(digivolutionRequirementsFor("EX12-056")).toEqual([
      { level: 4, traits: ["Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(digiXrosRequirementFor("EX12-056")).toEqual([
      {
        materials: [
          {
            nameOrTrait: [
              { tokens: ["Gokuumon"], match: "text" },
              { tokens: ["SW"], match: "trait" },
            ],
            levelMax: 5,
          },
        ],
        count: 2,
        maxMaterials: 1,
      },
    ]);

    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "byOpponentEffect",
          affectsAll: true,
          // "they don't leave" — the protected set is every OTHER of your Digimon in the
          // same leave event, never a single chosen one.
          target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: "all" },
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent", kind: ["Digimon"] } } },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Alliance" },
            optional: true,
            duration: "forTheTurn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ match: "trait", tokens: ["SW"] }],
              },
            },
          },
          {
            kind: "Attack",
            mandatory: true,
            condition: { kind: "ifThisEffectActed" },
            attackPlayer: true,
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, sameTarget: true },
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true }] },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(registeredCompiledCards.get("EX12-056")).toEqual(compiled);
    expect(compiledEffects["EX12-056"]).toEqual(compiled);
  });

  it("Q6851/Q6853 accepts text-only or SW DigiXros material, enforces level 5, and caps at one", async () => {
    for (const materialCardId of ["EX6-024", "EX12-012"]) {
      const s = setupEngine({
        0: {
          hand: [
            { card: "EX12-056", as: "target" },
            { card: materialCardId, as: "material" },
          ],
        },
      });
      s.state.memory = 7;
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("target").instanceId,
          digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
        } as never),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX12-056"));
      expect(s.state.memory).toBe(2);
    }

    const tooHigh = setupEngine({
      0: {
        hand: [
          { card: "EX12-056", as: "target" },
          { card: "EX12-019", as: "material" },
        ],
      },
    });
    tooHigh.state.memory = 7;
    expect(
      tooHigh.engine.applyIntent(0, {
        type: "playCard",
        instanceId: tooHigh.inst("target").instanceId,
        digiXros: { materialInstanceIds: [tooHigh.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: false, reason: "invalid-material" });

    const tooMany = setupEngine({
      0: {
        hand: [
          { card: "EX12-056", as: "target" },
          { card: "EX12-012", as: "first" },
          { card: "EX12-022", as: "second" },
        ],
      },
    });
    tooMany.state.memory = 7;
    expect(
      tooMany.engine.applyIntent(0, {
        type: "playCard",
        instanceId: tooMany.inst("target").instanceId,
        digiXros: { materialInstanceIds: [tooMany.inst("first").instanceId, tooMany.inst("second").instanceId] },
      } as never),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("uses Guard to delete itself and prevent an opponent-effect deletion of another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-056", as: "guard" },
            { card: "EX12-015", as: "protected" },
          ],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const protectedId = s.perm("protected").permanentId;
    const guardId = s.perm("guard").permanentId;
    const fx = (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause: string): Promise<number> } }
    ).primitives;
    await fx.deletePermanent([protectedId], "byEffect");
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === guardId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX12-056");
  });

  it("fires the real On Play resolution for De-Digivolve and the Alliance/attack sequence", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-056", as: "cho" },
            { card: "EX12-015", as: "ally" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-015", as: "opponent" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );

    await s.ready();
    const resolution = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cho"));
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("cho").permanentId })).toEqual({
      ok: true,
    });
    await resolution;
    await settle();
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "effectResolved",
        sourceCardId: "EX12-056",
        timing: "OnPlay",
      }),
    );
  });

  it("redirects an opponent attack to Cho-Hakkaimon through the inherited once-per-turn watcher", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-015", as: "host", under: ["EX12-056"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    const choId = s.perm("host").permanentId;
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === choId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
  });

  it("uses both normal colors and the Shambala alternate, rejects a nonmatch, and matches catalog identity", async () => {
    expect(getCardDefinition("EX12-056")).toMatchObject({
      nameEn: "Cho-Hakkaimon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      playCost: 7,
      dp: 7000,
      level: 5,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Puppet", "Shambala", "SW"],
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
    });
    for (const [baseCardId, useAlternateCost, expectedCost] of [
      ["EX12-054", false, 4],
      ["BT12-038", false, 4],
      ["EX12-012", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX12-056", as: "target" }] },
      });
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-056");
      expect(s.state.memory).toBe(4 - expectedCost);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-017", as: "base" }], hand: [{ card: "EX12-056", as: "target" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
