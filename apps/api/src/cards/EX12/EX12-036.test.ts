import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-036";

/**
 * A3 for EX12-036's `[All Turns][Once Per Turn]` watcher: "When any Digimon are played or
 * digivolve, 1 of your opponent's Digimon can't activate [When Digivolving] effects until
 * their turn ends."
 *
 * Q1e (regression contract): the committed corpus compiled this restriction to a bare
 * `"activate"` — not the interpreter's actual declared RestrictionKind
 * `"cannotActivateWhenDigivolving"` (ir.ts; read by context.ts's canTrigger gate, KB
 * BT19-038 Q5541-Q5545). `"activate"` has NO consumer at all, so the restriction was
 * silently inert: the targeted Digimon could still activate its [When Digivolving]
 * effects. `restrictionFromVerb` now recognizes "activate [When Digivolving] effects" and
 * emits the real, read RestrictionKind. The same bug affected BT20-034's corpus entry
 * (compiled to the differently-wrong "activateWhenDigivolving" typo) — this card is used
 * for the behavioral proof because its trigger (`whenPlayed`) is a simple, direct fire,
 * unlike BT20-034's `onAddDigivolutionCards` watcher, whose OWN separate, pre-existing
 * sourceFilter gap (its `kind: ["Tamer"]` checks the RECEIVER Digimon, not the placed
 * card — see primitives.ts's `fireSubTrigger("onAddDigivolutionCards", ...)`, which passes
 * no placed-card-kind data at all) means it can never fire regardless of this fix. That is
 * a separate, deeper bug this pass does not attempt to fix — flagged in the report.
 *
 * FAILS-WHEN-REVERTED: recompiling with the pre-fix `restrictionFromVerb` reinstates the
 * bare `"activate"` string, and `hasRestriction(..., "cannotActivateWhenDigivolving")`
 * goes back to false even right after the watcher fires.
 */
describe("EX12-036 Ryugumon", () => {
  it("maps the evolution, keywords, shared once-per-turn timing, and both printed restrictions", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "Ryugumon",
      colors: ["Blue", "Yellow"],
      playCost: 12,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Mollusk", "Sanmyojin", "Tentei Hachibushu", "Shambala", "TB"],
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Yellow", level: 5, memoryCost: 4 },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Aquatic", "Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }),
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Evade", raw: "＜Evade＞" }] }),
        expect.objectContaining({
          trigger: "Static",
          keywords: [expect.objectContaining({ keyword: "Decode" })],
        }),
      ]),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "Unsuspend",
            optional: true,
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              target: {
                filter: {
                  zone: "hand",
                  controller: "mine",
                  levelComparison: { op: "lte", value: 6 },
                  nameOrTrait: [
                    { tokens: ["Aqua", "Sea Animal"], match: "traitContains" },
                    { tokens: ["TB"], match: "trait" },
                  ],
                },
                count: 1,
                from: ["hand"],
              },
            },
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }],
    });
    const watcher = compiled.effects.find(
      (effect) => effect.trigger === "AllTurns" && effect.frequency === "OncePerTurn",
    )!;
    expect(watcher.frequency).toBe("OncePerTurn");
    expect(watcher).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            { kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" },
            {
              kind: "Restrict",
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
              target: { sameTarget: true },
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            { kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" },
            {
              kind: "Restrict",
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
              target: { sameTarget: true },
            },
          ],
        },
      ],
    });
    expect(
      compiled.effects.find(({ actions }) => actions.some((action) => action.kind === "Replacement")),
    ).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
              target: {
                filter: {
                  levelComparison: { op: "lte", value: 5 },
                  nameOrTrait: [
                    { tokens: ["Aqua", "Sea Animal"], match: "traitContains" },
                    { tokens: ["TB"], match: "trait" },
                  ],
                },
              },
            },
          ],
        },
      ],
    });
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("restricts the chosen opponent Digimon from activating [When Digivolving] effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-036", as: "src" },
            { card: "BT1-009", dp: 2000, as: "played" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 2000, as: "opp" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opp = s.perm("opp");

    await s.engine.recomputeContinuousEffects();
    await (
      s.engine as unknown as { fireSubTrigger: (event: string, payload: unknown) => Promise<void> }
    ).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("src").permanentId });
    await settle(() => false, 60);

    const continuous = (
      s.engine as unknown as {
        continuous: { hasRestriction(id: string, restriction: string): boolean };
      }
    ).continuous;
    expect(continuous.hasRestriction(opp.permanentId, "beSuspended")).toBe(true);
    expect(continuous.hasRestriction(opp.permanentId, "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("fires the same restrictions when one of your Digimon digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-036", as: "src" },
            { card: "BT1-009", as: "evolving" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 2000, as: "opp" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opp = s.perm("opp");
    await s.engine.recomputeContinuousEffects();
    await (
      s.engine as unknown as { fireSubTrigger: (event: string, payload: unknown) => Promise<void> }
    ).fireSubTrigger("whenOneOfYoursDigivolves", { subjectPermanentId: s.perm("src").permanentId });
    await settle(() => false, 60);

    expect(observe(s.engine).isRestricted(opp, "beSuspended")).toBe(true);
    expect(observe(s.engine).isRestricted(opp, "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("negative control: the restriction is never granted without the watcher firing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-036", as: "src" },
            { card: "BT1-009", dp: 2000, as: "played" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 2000, as: "opp" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opp = s.perm("opp");
    await settle(() => false, 60);

    const continuous = (
      s.engine as unknown as {
        continuous: { hasRestriction(id: string, restriction: string): boolean };
      }
    ).continuous;
    expect(continuous.hasRestriction(opp.permanentId, "suspend")).toBe(false);
    expect(continuous.hasRestriction(opp.permanentId, "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("pays with an Aquabeast hand card, places it at the true bottom, and shares once-per-turn use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", suspended: true, under: ["BT1-029"] }],
          hand: [
            { card: "BT10-023", as: "aquabeast" },
            { card: "EX12-031", as: "secondCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const aquabeastId = s.inst("aquabeast").instanceId;
    const secondCostId = s.inst("secondCost").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("source").stack[0]?.instanceId).toBe(aquabeastId);

    s.perm("source").isSuspended = true;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(secondCostId);
  });

  it("executes Decode for Aqua-containing and TB traits, but enforces Q6785 and excludes battle", async () => {
    for (const decodeCardId of ["BT10-023", "EX12-031"]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: cardId, as: "source", suspended: true, under: [{ card: decodeCardId, as: "decode" }] },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const decodeId = s.inst("decode").instanceId;
      expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(1);
      expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === decodeId)).toBe(true);
    }
    for (const [decodeCardId, cause] of [
      ["BT10-027", "byEffect"],
      [cardId, "byEffect"],
      ["BT10-023", "byBattle"],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: cardId, as: "source", suspended: true, under: [{ card: decodeCardId, as: "candidate" }] },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], cause)).toBe(1);
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
    }
  });

  it("uses its printed Barrier to prevent effect deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "source", suspended: true }], security: ["BT1-029"] },
    });
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([sourceId], "byBattle");
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: sourceId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sourceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("uses both normal colors and the Aquatic/Shambala alternate evolution", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["BT1-040", false, 4],
      ["EX12-044", false, 4],
      ["BT15-078", true, 3],
      ["EX12-063", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = memory;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT23-056", as: "base" }], hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("blocks the When Digivolving activation and its cost, but preserves When Attacking use (Q6790-Q6794)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }] },
        1: {
          battleArea: [{ card: cardId, as: "restricted", suspended: true }],
          hand: [{ card: "BT10-023", as: "cost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const costId = s.inst("cost").instanceId;
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("source").permanentId });
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "cannotActivateWhenDigivolving")).toBe(true);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("restricted"));
    expect(s.perm("restricted").isSuspended).toBe(true);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(costId);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("restricted"));
    expect(s.perm("restricted").isSuspended).toBe(false);
    expect(s.perm("restricted").stack[0]?.instanceId).toBe(costId);
  });
});
