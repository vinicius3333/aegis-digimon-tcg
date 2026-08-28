import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-026";

describe("EX11-026 Pteromon", () => {
  it("suspends an own Digimon and grants an eligible ally +3000 DP", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-012", as: "ally", dp: 2000 }], hand: [{ card: "EX11-026", as: "pteromon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const ally = s.perm("ally");
    const initialDP = ally.currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => ally.currentDP === initialDP + 3000, 600);
    expect(ally.isSuspended).toBe(true);
    expect(ally.currentDP).toBe(initialDP + 3000);
  });

  it("encodes both entry timings, any-player suspension, exact trait groups, and inherited battle memory", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Pteromon",
      colors: ["Green"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      types: ["Bird Dragon", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, cost: 0, isAlternate: true }]);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { controllerDefault: "any" } }, optional: true },
          {
            kind: "ModifyDP",
            amount: 3000,
            condition: { kind: "ifThisEffectActed" },
            target: {
              filter: {
                nameOrTrait: [
                  { tokens: ["Avian", "Bird"], match: "trait" },
                  { tokens: ["Vortex Warriors"], match: "trait" },
                ],
              },
            },
          },
        ],
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenBattleWon",
            sourceFilter: { isSelfRef: true },
            actions: [{ kind: "GainMemory", amount: 1 }],
          },
        ],
      }),
    );
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  it("may suspend an opposing Digimon but then does not grant the conditional DP bonus", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source", dp: 1000, suspended: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: false },
    );
    const firing = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
    expect(decision.options?.candidateInstanceIds).toContain(s.perm("opponent").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("opponent").permanentId] },
      }),
    ).toEqual({ ok: true });
    await firing;
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("source").currentDP).toBe(1000);
    assertNoLoudGap(s);
  });

  it("may decline suspension and leaves every Digimon unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-012", as: "bird", dp: 2000 },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenMoving, s.perm("source"));
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("bird").isSuspended).toBe(false);
    expect(s.perm("bird").currentDP).toBe(2000);
    assertNoLoudGap(s);
  });

  it("gains memory only once per turn when its evolved host wins battles", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-029", as: "host", under: [cardId] }] } });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("host").permanentId });
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("accepts the printed unrestricted Lv.2 alternate route and rejects Lv.3", async () => {
    const valid = setupEngine({
      0: { battleArea: [{ card: "EX11-003", as: "level2" }], hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("level2").permanentId,
        instanceId: valid.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "level3" }], hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("level3").permanentId,
        instanceId: invalid.inst("source").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
