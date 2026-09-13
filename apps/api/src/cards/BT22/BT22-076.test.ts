import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-076.js";

describe("BT22-076 ShinMonzaemon", () => {
  it("keeps the ordinary purple/yellow routes and DM alternate route", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, colors: ["Purple"], cost: 5, isAlternate: false },
      { level: 5, colors: ["Yellow"], cost: 5, isAlternate: false },
      { level: 5, traits: ["DM"], cost: 5, isAlternate: true },
    ]);
  });
  it("reduces only Ver.1 digivolutions into ShinMonzaemon", () => {
    const modifier = compiled.effects.find((entry) => entry.trigger === "Static")?.actions[0] as any;
    expect(modifier).toMatchObject({
      kind: "CostModifier",
      costType: "digivolve",
      mode: "delta",
      amount: -2,
      handResident: true,
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Ver.1"], match: "trait" }],
      },
      into: { cardId: "BT22-076" },
      duration: "permanent",
    });
    expect(compiled.digivolutionRequirement).toContainEqual({ level: 5, traits: ["DM"], cost: 5, isAlternate: true });
  });

  it("places either player's qualifying Digimon into security after trashing the bottom face-down card", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        source: {
          filter: { controllerDefault: "any", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
          count: 1,
        },
        cost: {
          kind: "trash",
          target: { filter: { isSelfRef: true, faceDown: true, position: "bottom" }, isSelf: true },
        },
      });
    }
  });

  it("stacks the Ver.1 self-reduction with the printed public evolution cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-038", as: "monzaemon" }], hand: [{ card: "BT22-076", as: "shin" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monzaemon").permanentId,
        instanceId: s.inst("shin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("monzaemon").topCard?.cardId === "BT22-076");
    expect(s.state.memory).toBe(7);
  });

  it("does not multiply the incoming card's intrinsic reduction for extra copies in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-038", as: "monzaemon" }],
        hand: [
          { card: "BT22-076", as: "shin" },
          { card: "BT22-076", as: "spare" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monzaemon").permanentId,
        instanceId: s.inst("shin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("monzaemon").topCard?.cardId === "BT22-076");
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("spare").instanceId)).toBe(true);
  });

  it("keeps the intrinsic reduction owner-scoped when both players hold copies", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-038", as: "monzaemon" }], hand: [{ card: "BT22-076", as: "own" }] },
      1: { hand: [{ card: "BT22-076", as: "opponent" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monzaemon").permanentId,
        instanceId: s.inst("own").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("monzaemon").topCard?.cardId === "BT22-076");
    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponent").instanceId)).toBe(true);

    const reverse = setupEngine({
      0: { hand: [{ card: "BT22-076", as: "opponent" }] },
      1: { battleArea: [{ card: "BT22-038", as: "monzaemon" }], hand: [{ card: "BT22-076", as: "own" }] },
    });
    reverse.state.turnSeat = 1;
    reverse.state.memory = 10;
    await reverse.ready();
    expect(
      reverse.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: reverse.perm("monzaemon").permanentId,
        instanceId: reverse.inst("own").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => reverse.perm("monzaemon").topCard?.cardId === "BT22-076");
    expect(reverse.state.memory).toBe(7);
    expect(reverse.state.players[0]!.hand.some((card) => card.instanceId === reverse.inst("opponent").instanceId)).toBe(
      true,
    );
  });

  it("places a qualifying opponent Digimon into security on a public digivolution", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-038", as: "base", under: [{ card: "BT22-037", faceUp: false }] }],
          hand: [{ card: "BT22-076", as: "shin" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    const bottomSourceId = s.perm("base").stack[0]!.instanceId;
    const targetId = s.perm("target").topCard!.instanceId;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === targetId));

    expect(s.state.players[0]!.security[0]?.instanceId).toBe(targetId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bottomSourceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("places a qualifying Digimon into security from the public attack trigger", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-076", as: "shin", under: [{ card: "BT22-037", faceUp: false }] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "target" }],
          deck: ["BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017", "BT1-018"],
          security: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;
    preferInstanceIds.push(targetId);
    const bottomSourceId = s.perm("shin").stack[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shin").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === targetId));

    expect(s.state.players[0]!.security[0]?.instanceId).toBe(targetId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bottomSourceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("shares the Once Per Turn use between digivolving and attacking, then resets next turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-038",
              as: "host",
              under: [
                { card: "BT22-037", faceUp: false },
                { card: "BT22-037", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "BT22-076", as: "shin" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "firstTarget" },
            { card: "BT1-013", as: "secondTarget" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.push(s.perm("firstTarget").topCard!.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("shin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT22-076");
    expect(s.perm("host").stack.filter((card) => card.cardId === "BT22-037")).toHaveLength(1);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("host").stack.filter((card) => card.cardId === "BT22-037")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.push(s.perm("secondTarget").topCard!.instanceId);
    const secondTargetId = s.perm("secondTarget").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.filter((card) => card.cardId === "BT22-037").length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === secondTargetId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("settles an attack-trigger refusal without trashing a source or moving a target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-076", as: "shin", under: [{ card: "BT22-037", faceUp: false }] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "target" }],
          deck: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
          security: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;
    const sourceId = s.perm("shin").stack[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shin").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const prompt = s.state.pendingDecision;
    expect(prompt).toBeDefined();
    expect(
      s.engine.applyIntent(prompt!.seat, {
        type: "respondDecision",
        decisionId: prompt!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("shin").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });
});
