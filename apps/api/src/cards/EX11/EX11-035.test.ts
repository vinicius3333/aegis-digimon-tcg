import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-035";

describe("EX11-035 Zephagamon", () => {
  it("preserves printed stats, keywords, cross-player choices, and event-scoped DP scaling", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Zephagamon",
      colors: ["Green"],
      level: 6,
      playCost: 11,
      dp: 12000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 3 }],
      types: ["Magic Knight", "Vortex Warriors", "LIBERATOR", "Bird Dragon"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([]);
    expect(digivolutionRequirementsFor(cardId)).toEqual([]);
    expect(compiled.effects.filter(({ trigger }) => trigger === "Static").flatMap(({ keywords }) => keywords)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Piercing" }),
        expect.objectContaining({ keyword: "Vortex" }),
        expect.objectContaining({ keyword: "Blocker" }),
      ]),
    );
    const digivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")!;
    expect(digivolving.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "Unsuspend",
          optional: true,
          target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
        }),
        expect.objectContaining({
          kind: "Suspend",
          optional: true,
          target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
        }),
      ]),
    );
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(allTurns.actions).toHaveLength(1);
    expect(allTurns.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(irNode(allTurns.actions[0]!).actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      dpCeilingModifier: { mode: "raiseCeiling", amount: 2000 },
    });
  });

  it("may unsuspend and suspend either player's Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source", suspended: true }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("plays an Avian up to the DP ceiling raised by all suspended Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "trigger" },
          ],
          hand: [{ card: "BT16-007", as: "avian" }],
        },
        1: { battleArea: [{ card: "BT1-010", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("avian").instanceId);
    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT16-007")).toBe(true);
    assertNoLoudGap(s);
  });
});
