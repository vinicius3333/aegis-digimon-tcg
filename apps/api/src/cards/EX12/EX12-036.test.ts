import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

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
    const compiled = registeredCompiledCards.get("EX12-036")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Aquatic", "Shambala"], cost: 3, isAlternate: true },
    ]);
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
                    { tokens: ["Aqua", "Sea Animal"], match: "trait" },
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
    const watcher = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
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
    ).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("played").permanentId });
    await settle(() => false, 60);

    const continuous = (
      s.engine as unknown as {
        continuous: { hasRestriction(id: string, restriction: string): boolean };
      }
    ).continuous;
    expect(continuous.hasRestriction(opp.permanentId, "suspend")).toBe(true);
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
    ).fireSubTrigger("whenOneOfYoursDigivolves", { subjectPermanentId: s.perm("evolving").permanentId });
    await settle(() => false, 60);

    expect(observe(s.engine).isRestricted(opp, "suspend")).toBe(true);
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
});
