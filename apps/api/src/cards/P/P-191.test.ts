import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import "../BT10/BT10-042.js";
import "../BT25/BT25-103.js";
import "../BT8/BT8-030.js";
import "../EX5/EX5-012.js";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-191.js";
import "../BT22/BT22-077.js";

describe("P-191 Apollomon", () => {
  it("encodes Light Fang/Night Claw evolution and Blast Digivolve", () => {
    const card = runtimeCompiledCard("P-191")!;
    expect(card.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Light Fang", "Night Claw"], cost: 3, isAlternate: true },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("uses a fixed 7000 DP deletion budget and reduces exactly one target at both timings", () => {
    const card = runtimeCompiledCard("P-191")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -4000,
            scaling: { per: 1, unit: "cards", filter: { nameOrTrait: [{ tokens: ["Olympos XII"], match: "trait" }] } },
          },
          {
            kind: "DeleteByDPBudget",
            baseBudget: 7000,
            target: { count: "all" },
          },
        ],
      });
      expect(card.effects.find((effect) => effect.trigger === trigger)?.actions?.[1]).not.toHaveProperty("budgetBonus");
    }
  });

  it("keeps the DNA-then-attack sequence and inherited once-per-turn attack", () => {
    const card = runtimeCompiledCard("P-191")!;
    expect(card.effects.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        {
          kind: "DnaDigivolve",
          optional: true,
          payCost: true,
          into: {
            zone: "hand",
            nameOrTrait: [{ tokens: ["GraceNovamon"], match: "nameExact" }],
          },
        },
        { kind: "Attack", optional: true },
      ],
    });
    expect(card.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "Attack", optional: true }],
    });
  });

  it("publicly plays for 7 and applies one-target reduction with a fixed 7000 budget", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-191", as: "source" }],
          battleArea: [{ card: "BT10-042", as: "allyOlympos" }],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
          security: Array.from({ length: 5 }, () => "BT3-059"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "reducedTarget", dp: 20000 },
            { card: "BT1-009", as: "withinBudget", dp: 1 },
            { card: "BT1-009", as: "sevenThousandAndOne", dp: 7001 },
            { card: "BT1-009", as: "untouched", dp: 12000 },
          ],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
          security: Array.from({ length: 5 }, () => "BT3-059"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("reducedTarget").instanceId);
    const sourceId = s.inst("source").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === sourceId) &&
        s.state.players[1]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("reducedTarget").instanceId,
        ) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(3);
    expect(s.perm("reducedTarget").currentDP).toBe(12000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).not.toContain(
      s.inst("withinBudget").instanceId,
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("sevenThousandAndOne").instanceId,
    );
    expect(s.perm("untouched").currentDP).toBe(12000);
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
  });

  it("publicly pays the Light Fang alternate cost of 3 and retains its exact parent source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-012", as: "lightFangParent" }],
          hand: [{ card: "P-191", as: "source" }],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
          security: Array.from({ length: 5 }, () => "BT3-059"),
        },
        1: { deck: Array.from({ length: 20 }, () => "BT3-059"), security: Array.from({ length: 5 }, () => "BT3-059") },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const parentId = s.perm("lightFangParent").permanentId;
    const parentSourceId = s.inst("lightFangParent").instanceId;
    const sourceId = s.inst("source").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: parentId,
        instanceId: sourceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("lightFangParent").topCard.instanceId === sourceId && s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(7);
    expect(s.perm("lightFangParent").stack.map((card) => card.instanceId)).toEqual([parentSourceId]);
    expect(s.perm("lightFangParent").permanentId).toBe(parentId);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("DNA digivolves at the natural end, attacks once, and keeps the original sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-191", as: "apollomon" },
            { card: "BT8-030", as: "bluePartner" },
          ],
          hand: [{ card: "BT25-103", as: "grace" }],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
          security: Array.from({ length: 5 }, () => "BT3-059"),
        },
        1: { deck: Array.from({ length: 20 }, () => "BT3-059"), security: Array.from({ length: 5 }, () => "BT3-059") },
      },
      { autoSelectCards: true },
    );
    const apollomonId = s.perm("apollomon").permanentId;
    const partnerId = s.perm("bluePartner").permanentId;
    const apollomonSourceId = s.inst("apollomon").instanceId;
    const partnerSourceId = s.inst("bluePartner").instanceId;
    const graceId = s.inst("grace").instanceId;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    const apollomonResolved = () =>
      s.events.some(
        (event) => event.kind === "effectResolved" && event.sourceCardId === "P-191" && event.timing === "OnEndTurn",
      );
    while (!apollomonResolved()) {
      await settle(() => apollomonResolved() || s.state.pendingDecision?.kind === "optional");
      if (apollomonResolved()) break;
      const decision = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept: decision.sourceCardId !== "BT25-103" },
        }),
      ).toEqual({ ok: true });
    }
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === graceId) &&
        s.events.filter((event) => event.kind === "securityChecked").length === 2 &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    const grace = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === graceId)!;
    expect(grace.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([apollomonSourceId, partnerSourceId]),
    );
    expect(grace.stack).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(apollomonId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(partnerId);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(19);
    expect(s.state.memory).toBe(3);
    expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "digivolve")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("still allows the separate end-turn attack when DNA is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-191", as: "apollomon" },
            { card: "BT8-030", as: "bluePartner" },
          ],
          hand: [{ card: "BT25-103", as: "grace" }],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
          security: Array.from({ length: 5 }, () => "BT3-059"),
        },
        1: { deck: Array.from({ length: 20 }, () => "BT3-059"), security: Array.from({ length: 5 }, () => "BT3-059") },
      },
      { autoSelectCards: true },
    );
    const sourceId = s.inst("apollomon").instanceId;
    const partnerId = s.perm("bluePartner").permanentId;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const dnaDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dnaDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const attackDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked") &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === sourceId)).toBe(true);
    expect(s.perm("bluePartner").permanentId).toBe(partnerId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT25-103")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("uses the inherited source for one natural end-turn attack each cycle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", dp: 10000, under: [{ card: "P-191", as: "source" }] }],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
          security: Array.from({ length: 5 }, () => "BT3-059"),
        },
        1: { deck: Array.from({ length: 20 }, () => "BT3-059"), security: Array.from({ length: 5 }, () => "BT3-059") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 1 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(sourceId);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 2 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(sourceId);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("P-191 Apollomon — KB Q&A rulings", () => {
  const filler = (count: number) => Array.from({ length: count }, () => "BT3-059");

  async function playApollomon(opponents: { as: string; dp: number }[], declinePrompts: string[] = []) {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-191", as: "source" }], deck: filler(20), security: filler(5) },
        1: {
          battleArea: opponents.map(({ as, dp }) => ({ card: "BT1-009", as, dp })),
          deck: filler(20),
          security: filler(5),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts },
    );
    s.state.memory = 10;
    await s.ready();
    const firstDecision = s.decisions.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "P-191"),
    );
    return { s, decisions: s.decisions.slice(firstDecision) };
  }

  it("leaves a 0 DP Digimon on the field until the effect finishes, then the rule check deletes it (Q4980)", async () => {
    const { s, decisions } = await playApollomon([{ as: "zeroed", dp: 4000 }], ["Delete "]);
    const budgetPrompt = decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "P-191");
    expect(budgetPrompt?.req.promptText).toContain("DP 0");
    const effectEnd = s.events.findIndex((event) => event.kind === "effectResolved" && event.sourceCardId === "P-191");
    const deletion = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.deletedPermanents !== undefined,
    );
    expect(deletion).toBeGreaterThan(effectEnd);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("reduces the DP of only 1 of the opponent's Digimon (Q4981)", async () => {
    const { s } = await playApollomon([
      { as: "first", dp: 20000 },
      { as: "second", dp: 20000 },
    ]);
    expect([s.perm("first").currentDP, s.perm("second").currentDP].sort()).toEqual([16000, 20000]);
  });

  async function endTurnWithApollomon(acceptDna: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-191", as: "apollomon" },
            { card: "BT8-030", as: "bluePartner" },
          ],
          hand: [{ card: "BT25-103", as: "grace" }],
          deck: filler(20),
          security: filler(5),
        },
        1: { deck: filler(20), security: filler(5) },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    const endOfTurnDone = () => s.state.turnSeat === 1;
    while (!endOfTurnDone()) {
      await settle(() => endOfTurnDone() || s.state.pendingDecision?.kind === "optional");
      if (endOfTurnDone()) break;
      const decision = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
      const isDnaPrompt =
        decision.sourceCardId === "P-191" &&
        !s.events.some((event) => event.kind === "attackDeclared") &&
        s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "P-191").length === 1;
      const accept = decision.sourceCardId === "BT25-103" ? false : isDnaPrompt ? acceptDna : true;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
    }
    const attacks = s.events.filter(
      (event): event is Extract<ServerEvent, { kind: "attackDeclared" }> => event.kind === "attackDeclared" && event.seat === 0,
    );
    const finish = async () => {
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    };
    return { s, attacks, finish };
  }

  it("lets the DNA digivolved GraceNovamon attack with the same effect (Q4982)", async () => {
    const { s, attacks, finish } = await endTurnWithApollomon(true);
    const grace = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("grace").instanceId)!;
    expect(grace).toBeDefined();
    expect(attacks.map((event) => event.attackerPermanentId)).toEqual([grace.permanentId]);
    await finish();
  });

  it("still lets 1 Digimon attack when the DNA digivolution is declined (Q4983)", async () => {
    const { s, attacks, finish } = await endTurnWithApollomon(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("grace").instanceId);
    expect(attacks).toHaveLength(1);
    await finish();
  });

  it("does not activate its inherited effect after DNA digivolving into GraceNovamon at end of turn (Q4984)", async () => {
    const { s, attacks, finish } = await endTurnWithApollomon(true);
    const grace = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("grace").instanceId)!;
    expect(grace.stack.map((card) => card.instanceId)).toContain(s.inst("apollomon").instanceId);
    expect(attacks).toHaveLength(1);
    expect(
      s.events.some(
        (event) =>
          event.kind === "effectTriggered" &&
          event.sourceCardId === "P-191" &&
          event.sourcePermanentId === grace.permanentId,
      ),
    ).toBe(false);
    await finish();
  });

  async function endTurnWithDianamon(
    suspended: boolean,
    first: string,
  ): Promise<{ s: EngineSetup; finish: () => Promise<void> }> {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-077", as: "dianamon", suspended, under: ["P-191"] }],
          deck: filler(20),
          security: filler(5),
        },
        1: { deck: filler(20), security: filler(5) },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [first] },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const finish = async () => {
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    };
    return { s, finish };
  }

  it("attacks with the inherited effect, then unsuspends with Dianamon's end-of-turn effect (Q4985)", async () => {
    const { s, finish } = await endTurnWithDianamon(false, "P-191");
    expect(s.events.filter((event) => event.kind === "attackDeclared" && event.seat === 0)).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.perm("dianamon").isSuspended).toBe(false);
    await finish();
  });

  it("unsuspends a suspended Dianamon first, then attacks with the inherited effect (Q4986)", async () => {
    const { s, finish } = await endTurnWithDianamon(true, "BT22-077");
    expect(s.events.filter((event) => event.kind === "attackDeclared" && event.seat === 0)).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.perm("dianamon").isSuspended).toBe(true);
    await finish();
  });
});
