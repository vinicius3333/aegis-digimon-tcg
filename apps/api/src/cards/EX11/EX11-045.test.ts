import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-045";

describe("EX11-045 Metatromon", () => {
  it("captures the official Assembly -5 recipe", () => {
    expect(runtimeCompiledCard(cardId)?.assemblyRequirement).toEqual([
      {
        reduceCost: 5,
        materials: [
          { kinds: ["Digimon"], colors: ["Black"], nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }], count: 5 },
        ],
      },
    ]);
  });
  it("preserves printed stats, text evolution, Blocker, and event-scoped inherited deletion", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Metatromon",
      colors: ["Black"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }],
      types: ["Machine", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, texts: ["Maquinamon"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    // Printed ＜Blocker＞ lives on the keyword line, the shape registration reads for printed
    // keywords (peers EX11-035 / EX11-073).
    expect(compiled.effects.filter(({ trigger }) => trigger === "Static").flatMap(({ keywords }) => keywords)).toEqual(
      expect.arrayContaining([expect.objectContaining({ keyword: "Blocker" })]),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "DeDigivolve", amount: 2 },
          { kind: "Restrict", restriction: "digivolve", duration: "untilOpponentTurnEnd" },
        ],
      });
    }
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", sourceFilter: { isSelfRef: true } }],
    });
    expect(irNode(inherited.actions[0]!).actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "lowestPlayCost" } },
    });
  });

  it("carries printed Blocker on the field", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "source" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    assertNoLoudGap(s);
  });

  it("de-digivolves 2 and restricts an opposing Digimon from evolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }] },
        1: { battleArea: [{ card: "BT1-080", as: "target", under: ["BT1-009", "AD1-001", "EX11-042"] }] },
      },
      { autoSelectCards: true },
    );
    const target = s.perm("target");
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(target.stack).toHaveLength(1);
    expect(target.topCard.cardId).toBe("AD1-001");
    assertNoLoudGap(s);
  });

  it("free-evolves another Digimon into a green Maquinamon-text card at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "EX11-040", as: "other" },
          ],
          hand: [{ card: "EX11-033", as: "maneuvermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("source"));
    expect(s.perm("other").topCard.cardId).toBe("EX11-033");
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("deletes the lowest-cost opponent Digimon when an effect adds to this stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-040", as: "source", under: ["EX11-045", "BT1-009"] }],
        },
        1: {
          battleArea: [
            { card: "AD1-001", as: "low" },
            { card: "BT1-019", as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("source").permanentId,
      addedDigivolutionCardInstanceIds: [
        s.perm("source").stack.find(({ cardId: sourceCardId }) => sourceCardId === "EX11-045")!.instanceId,
      ],
    });
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([highId]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(lowId);
    assertNoLoudGap(s);
  });
});
