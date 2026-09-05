import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-036";

describe("EX11-036 Dalphomon", () => {
  it("captures the official Assembly -5 recipe", () => {
    expect(runtimeCompiledCard(cardId)?.assemblyRequirement).toEqual([
      {
        reduceCost: 5,
        materials: [
          { kinds: ["Digimon"], colors: ["Green"], nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }], count: 5 },
        ],
      },
    ]);
  });
  it("preserves printed stats, text evolution, Vortex, and self-scoped linking", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Dalphomon",
      colors: ["Green"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 4 }],
      types: ["Beast", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, texts: ["Maquinamon"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects.find(({ trigger }) => trigger === "Static")?.keywords).toContainEqual(
      expect.objectContaining({ keyword: "Vortex" }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({ trigger, frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" }),
      );
    }
    const inherited = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(inherited.actions).toHaveLength(1);
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
    });
    expect(irNode(inherited.actions[0]!).actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "Suspend" }),
        expect.objectContaining({ kind: "Attack", optional: true }),
      ]),
    );
  });

  it("suspends exactly 2 opposing Digimon or Tamers and independently restricts 1", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect([s.perm("first"), s.perm("second"), s.perm("third")].filter(({ isSuspended }) => isSuspended)).toHaveLength(
      2,
    );
    await advance(s.engine).verb.unsuspend([s.perm("first").permanentId]);
    expect(s.perm("first").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("digivolves another Digimon into a black Maquinamon-text card for free at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "EX11-040", as: "other" },
          ],
          hand: [{ card: "EX11-042", as: "next" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("source"));
    expect(s.perm("other").topCard.cardId).toBe("EX11-042");
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("never digivolves itself at end of turn, even into a card it legally could become", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "EX11-073", as: "next" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("source"));
    expect(s.perm("source").topCard.cardId).toBe(cardId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("next").instanceId]);
    assertNoLoudGap(s);
  });

  it("hands that same card to another eligible Digimon instead", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-080", as: "other" },
          ],
          hand: [{ card: "EX11-073", as: "next" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("source"));
    expect(s.perm("source").topCard.cardId).toBe(cardId);
    expect(s.perm("other").topCard.cardId).toBe("EX11-073");
    assertNoLoudGap(s);
  });

  it("inherits the linked suspend only when its own host is the linked Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-080", as: "host", under: [cardId] },
            { card: "BT1-009", as: "otherAlly" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("otherAlly").permanentId });
    expect(s.perm("victim").isSuspended).toBe(false);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("host").permanentId });
    expect(s.perm("victim").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
