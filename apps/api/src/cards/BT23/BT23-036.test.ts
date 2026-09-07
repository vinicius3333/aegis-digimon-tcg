import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-036.js";

describe("BT23-036 BanchoLeomon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-036")).toMatchObject({
      cardId: "BT23-036",
      nameEn: "BanchoLeomon",
      colors: ["Yellow", "Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Beastkin", "Boss", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["Leomon"], cost: 3, isAlternate: true },
      { traits: ["CS"], cost: 3, isAlternate: true, level: 5 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  // C1: printed evolution routes. Each case asserts the exact source instance stays in the
  // stack, the exact memory paid, and the digivolution bonus draw's exact instance.
  it.each([
    ["ordinary yellow level 5", "BT1-057", undefined, 4],
    ["ordinary red level 5", "BT1-024", undefined, 4],
    ["alternate Leomon name from an off-colour level 5", "BT9-063", 0, 3],
    ["alternate CS trait from an off-colour level 5", "BT23-044", 1, 3],
  ])("publicly digivolves into BanchoLeomon from a %s source", async (_label, sourceCard, alternateIndex, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: sourceCard, as: "source" }],
          hand: [{ card: "BT23-036", as: "bancho" }],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = cost;
    const sourceId = s.inst("source").instanceId;
    const banchoId = s.inst("bancho").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: banchoId,
        ...(alternateIndex === undefined ? {} : { useAlternateCost: true, alternateRequirementIndex: alternateIndex }),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.instanceId === banchoId && s.state.pendingDecision === undefined);

    expect(s.perm("source").topCard?.instanceId).toBe(banchoId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a level 4 source and leaves memory and both zones untouched", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-041", as: "tooLow" }],
        hand: [{ card: "BT23-036", as: "bancho" }],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    await s.ready();
    s.state.memory = 5;
    const banchoId = s.inst("bancho").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tooLow").permanentId,
        instanceId: banchoId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.perm("tooLow").topCard?.cardId).toBe("BT23-041");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([banchoId]);
  });

  // C2: the would-be-played replacement.
  it("pays the reduced play cost at the exact 10000-DP opponent boundary", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-036", as: "bancho" }] },
      1: { battleArea: [{ card: "BT1-024", as: "threshold" }] },
    });
    await s.ready();
    s.state.memory = 10;
    const banchoId = s.inst("bancho").instanceId;
    expect(s.perm("threshold").currentDP).toBe(10000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: banchoId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === banchoId));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not reduce its play cost below the 10000-DP boundary", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-036", as: "bancho" }] },
      1: { battleArea: [{ card: "BT23-033", as: "below" }] },
    });
    await s.ready();
    s.state.memory = 12;
    const banchoId = s.inst("bancho").instanceId;
    expect(s.perm("below").currentDP).toBe(8000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: banchoId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === banchoId));

    expect(s.state.memory).toBe(0);
  });

  // C3 / Q5297: the free digivolution offered to one OTHER Digimon, on both printed timings.
  it.each([
    ["Leomon name", "BT23-044", "BT4-061"],
    ["CS trait", "BT23-031", "BT23-034"],
  ])("On Play digivolves another Digimon into a level 6 %s card from hand for free", async (_label, base, into) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "recipient" }],
          hand: [
            { card: "BT23-036", as: "bancho" },
            { card: into, as: "destination" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 12;
    const banchoId = s.inst("bancho").instanceId;
    const destinationId = s.inst("destination").instanceId;
    const recipientId = s.inst("recipient").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: banchoId })).toEqual({ ok: true });
    await settle(
      () => s.perm("recipient").topCard?.instanceId === destinationId && s.state.pendingDecision === undefined,
    );

    expect(s.perm("recipient").topCard?.instanceId).toBe(destinationId);
    expect(s.perm("recipient").stack.map((card) => card.instanceId)).toEqual([recipientId]);
    // Only the 12-memory play cost is paid: the effect digivolution itself is free.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === banchoId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("When Digivolving digivolves another Digimon into a Leomon-name card from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-057", as: "source" },
            { card: "BT23-044", as: "recipient" },
          ],
          hand: [
            { card: "BT23-036", as: "bancho" },
            { card: "BT4-061", as: "destination" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const banchoId = s.inst("bancho").instanceId;
    const destinationId = s.inst("destination").instanceId;
    const recipientId = s.inst("recipient").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: banchoId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("recipient").topCard?.instanceId === destinationId && s.state.pendingDecision === undefined,
    );

    expect(s.perm("source").topCard?.instanceId).toBe(banchoId);
    expect(s.perm("recipient").topCard?.instanceId).toBe(destinationId);
    expect(s.perm("recipient").stack.map((card) => card.instanceId)).toEqual([recipientId]);
    expect(s.state.memory).toBe(0);
    // Two digivolutions happened, so two bonus draws landed; the destination left the hand.
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(destinationId);
  });

  it("never offers a level 7 CS card even when the recipient meets its printed requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-046", as: "recipient" }],
          hand: [
            { card: "BT23-036", as: "bancho" },
            { card: "BT23-047", as: "tooHigh" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 12;
    const banchoId = s.inst("bancho").instanceId;
    const tooHighId = s.inst("tooHigh").instanceId;
    const recipientId = s.inst("recipient").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: banchoId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === banchoId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(tooHighId);
    expect(s.perm("recipient").topCard?.instanceId).toBe(recipientId);
    expect(s.perm("recipient").stack).toHaveLength(0);
  });

  it("lets that same level 7 CS card be reached by paying for it publicly", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-046", as: "recipient" }],
          hand: [{ card: "BT23-047", as: "examon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const examonId = s.inst("examon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("recipient").permanentId,
        instanceId: examonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("recipient").topCard?.instanceId === examonId);

    expect(s.perm("recipient").topCard?.instanceId).toBe(examonId);
  });

  it("never offers a level 6 card that has neither the Leomon name nor the CS trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-031", as: "recipient" }],
          hand: [
            { card: "BT23-036", as: "bancho" },
            { card: "ST3-10", as: "neutral" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 12;
    const banchoId = s.inst("bancho").instanceId;
    const neutralId = s.inst("neutral").instanceId;
    const recipientId = s.inst("recipient").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: banchoId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === banchoId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(neutralId);
    expect(s.perm("recipient").topCard?.instanceId).toBe(recipientId);
    expect(s.perm("recipient").stack).toHaveLength(0);
  });

  it("excludes itself: with no other Digimon the hand keeps its qualifying card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-036", as: "bancho" },
            { card: "BT4-061", as: "destination" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 12;
    const banchoId = s.inst("bancho").instanceId;
    const destinationId = s.inst("destination").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: banchoId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === banchoId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([destinationId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("may decline the free digivolution and leave the recipient and hand untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-044", as: "recipient" }],
          hand: [
            { card: "BT23-036", as: "bancho" },
            { card: "BT4-061", as: "destination" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 12;
    const banchoId = s.inst("bancho").instanceId;
    const destinationId = s.inst("destination").instanceId;
    const recipientId = s.inst("recipient").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: banchoId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === banchoId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([destinationId]);
    expect(s.perm("recipient").topCard?.instanceId).toBe(recipientId);
    expect(s.perm("recipient").stack).toHaveLength(0);
  });

  // C4 / Q5298: end of your turn, through the production turn loop.
  //
  // The `＜Raid＞` grant lasts `forTheTurn`, and the turn ends the instant the effect
  // finishes, so the grant is only observable while the "may attack" prompt is still
  // pending. These tests therefore leave the optional prompt unanswered, assert the live
  // state, then answer it publicly.
  async function pendingOptionalAttack(s: ReturnType<typeof setupEngine>): Promise<string> {
    await settle(() => s.state.pendingDecision !== undefined);
    const pending = s.decisions.at(-1);
    expect(pending?.req.kind).toBe("optional");
    return pending!.req.decisionId;
  }

  it("Q5298: grants Raid at end of turn and still allows declining the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-036", as: "bancho" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          deck: ["BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    const decisionId = await pendingOptionalAttack(s);

    expect(observe(s.engine).hasKeyword(s.perm("bancho"), "Raid")).toBe(true);
    expect(s.perm("bancho").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("bancho").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("attacks with the same Digimon that gained Raid when the attack is accepted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-036", as: "bancho" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          deck: ["BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    const decisionId = await pendingOptionalAttack(s);
    expect(observe(s.engine).hasKeyword(s.perm("bancho"), "Raid")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("bancho").isSuspended).toBe(true);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("fires once on each of your own turns and never on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-036", as: "bancho" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const endOfTurnTriggers = (): number =>
      s.events.filter((event) => event.kind === "effectTriggered" && event.effectKey === "BT23-036/ir-3-0").length;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(endOfTurnTriggers()).toBe(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(endOfTurnTriggers()).toBe(1);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(endOfTurnTriggers()).toBe(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(endOfTurnTriggers()).toBe(2);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // IR shape guards. These pin the compiled clause the behavioral tests exercise.
  it("reduces its play cost when the opponent has a 10000+ DP Digimon", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          amount: 5,
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "gte", value: 10000 } },
          },
        },
      ],
    });
  });

  it("lets one other Digimon digivolve into a level 6-or-lower Leomon/CS Digimon from hand", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Digivolve",
        target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
        into: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 6 },
          nameOrTrait: [
            { tokens: ["Leomon"], match: "name" },
            { tokens: ["CS"], match: "trait" },
          ],
        },
        from: ["hand"],
        payCost: false,
        optional: true,
      });
    }
  });

  it("grants Raid and attacks the same Digimon at end of turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Raid" },
      target: { count: 1 },
    });
    expect(effect.actions[1]).toMatchObject({ kind: "Attack", target: { count: 1, sameTarget: true }, optional: true });
  });
});
