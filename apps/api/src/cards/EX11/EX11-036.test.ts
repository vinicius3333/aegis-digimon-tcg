import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
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
      { autoDeclineOptional: true, autoSelectCards: true },
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

  it("uses the public alternate Lv.5 Maquinamon-text evolution for cost 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-042", as: "base" }],
          hand: [{ card: cardId, as: "evolver" }],
        },
        1: { security: ["BT1-009"], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === cardId));
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toContain("EX11-042");
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

  it("publicly links to its evolved stack, suspends, then accepts the inherited attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-073", as: "base", under: ["EX11-044", cardId] }],
          hand: [
            { card: "EX11-027", as: "link1" },
            { card: "EX11-027", as: "link2" },
            { card: "EX11-027", as: "link3" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
            { card: "ST1-12", as: "tamer" },
          ],
          security: ["BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017", "BT1-018", "BT1-019"],
          deck: ["BT1-016", "BT1-017", "BT1-018", "BT1-019"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("base").topCard.cardId).toBe("EX11-073");
    expect(s.perm("base").stack.map(({ cardId: sourceId }) => sourceId)).toEqual(["EX11-044", cardId]);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link1").instanceId,
        targetPermanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.some(({ cardId: linkedId }) => linkedId === "EX11-027"));
    await settle(() => s.events.some((event) => event.kind === "attackDeclared"));
    await settle(() => s.perm("base").isSuspended);

    const inheritedTriggers = () =>
      s.events.filter(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === cardId && event.timing === "whenLinked",
      );
    expect(s.perm("base").linked.map(({ cardId: linkedId }) => linkedId)).toEqual(["EX11-027"]);
    const suspendedVictimIndex = s.events.findIndex(
      (event) =>
        event.kind === "cardsMoved" &&
        event.instanceIds.includes(s.perm("first").permanentId) &&
        event.from === "unsuspended" &&
        event.to === "suspended",
    );
    const inheritedAttackIndex = s.events.findIndex(
      (event) => event.kind === "attackDeclared" && event.attackerCardId === "EX11-073",
    );
    expect(suspendedVictimIndex).toBeGreaterThanOrEqual(0);
    expect(inheritedAttackIndex).toBeGreaterThan(suspendedVictimIndex);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.events.some((event) => event.kind === "attackDeclared" && event.attackerCardId === "EX11-073")).toBe(true);
    expect(inheritedTriggers()).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link2").instanceId,
        targetPermanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.length === 2);
    expect(inheritedTriggers()).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link3").instanceId,
        targetPermanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.length === 3);
    await settle(() => s.events.filter((event) => event.kind === "attackDeclared").length === 2);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(inheritedTriggers()).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not trigger from Mind Link, which places the Tamer in the digivolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-029", as: "base", under: ["EX11-042", cardId] },
            { card: "EX11-070", as: "mindLink" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim" }],
          deck: ["BT1-016", "BT1-017", "BT1-018", "BT1-019"],
          security: ["BT1-020", "BT1-021", "BT1-022"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("base").topCard.cardId).toBe("EX11-029");
    expect(s.perm("base").stack.map(({ cardId: sourceId }) => sourceId)).toContain("EX11-070");
    expect(s.perm("victim").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(
      s.events.some(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === cardId && event.timing === "whenLinked",
      ),
    ).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("uses the public On Play trigger to suspend 2 and restrict 1 from unsuspending", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: cardId, as: "dalphomon" }] },
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
    s.state.memory = 12;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dalphomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === cardId));

    expect(s.perm("dalphomon").topCard.cardId).toBe(cardId);
    expect(
      s.events.some(
        (event) =>
          event.kind === "effectTriggered" &&
          event.sourceCardId === cardId &&
          event.effectKey === `${cardId}/ir-shared-0` &&
          event.timing === "OnPlay",
      ),
    ).toBe(true);
    expect(["first", "second", "third"].filter((alias) => s.perm(alias).isSuspended)).toHaveLength(2);
    await advance(s.engine).verb.unsuspend([s.perm("first").permanentId]);
    expect(s.perm("first").isSuspended).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("second").permanentId]);
    expect(s.perm("second").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("shares the public Digivolving and Attacking use and resets it next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-042", as: "base" }],
          hand: [{ card: cardId, as: "evolver" }],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
          deck: ["BT1-017", "BT1-018", "BT1-019", "BT1-020", "BT1-021"],
          security: ["BT1-022", "BT1-023", "BT1-024", "BT1-025"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const uses = () =>
      s.events.filter(
        (event) =>
          event.kind === "effectTriggered" &&
          event.sourceCardId === cardId &&
          event.effectKey === `${cardId}/ir-shared-0`,
      );

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === cardId));
    expect(s.perm("base").stack.map(({ cardId: sourceId }) => sourceId)).toEqual(["EX11-042"]);
    expect(["first", "second", "third"].filter((alias) => s.perm(alias).isSuspended)).toHaveLength(2);
    expect(uses()).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackDeclared"));
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(uses()).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => uses().length === 2);
    expect(
      uses().map((event) => (event.kind === "effectTriggered" ? (event.printedTiming ?? event.timing) : undefined)),
    ).toEqual(["WhenDigivolving", "WhenAttacking"]);
    expect(["first", "second", "third"].filter((alias) => s.perm(alias).isSuspended)).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
