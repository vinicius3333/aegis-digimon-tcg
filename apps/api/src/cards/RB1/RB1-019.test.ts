import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("RB1-019 ShinMonzaemon", () => {
  it("moves every level 3 to its owner's security and weakens only opposing level 4 or higher Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-018", as: "base" },
            { card: "RB1-005", as: "ownLevel3" },
          ],
          hand: [{ card: "RB1-019", as: "shin" }],
        },
        1: {
          battleArea: [
            { card: "RB1-011", as: "opposingLevel3" },
            { card: "RB1-024", as: "opposingLevel5" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const oldTopId = s.inst("base").instanceId;
    const ownLevel3 = s.perm("ownLevel3").topCard.instanceId;
    const opposingLevel3 = s.perm("opposingLevel3").topCard.instanceId;

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length >= 1 && s.state.players[1]!.security.length >= 1);

    expect(s.state.players[0]!.security.at(0)).toMatchObject({ instanceId: ownLevel3, faceUp: false });
    expect(s.state.players[1]!.security.at(0)).toMatchObject({ instanceId: opposingLevel3, faceUp: false });
    expect(s.perm("opposingLevel5").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("opposingLevel5"), "SecurityAttack")).toBe(-1);
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(oldTopId);
  });

  it("weakens level 4 or higher opposing Digimon played later, through the opponent's next turn only (Discord 1555352172206493706)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-018", as: "base" }],
          hand: [{ card: "RB1-019", as: "shin" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          hand: [
            { card: "RB1-024", as: "laterLevel5" },
            { card: "RB1-011", as: "laterLevel3" },
            { card: "RB1-024", as: "duringTheirTurn" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "RB1-019" && s.state.pendingDecision === undefined);

    await advance(s.engine).verb.playInstances([s.inst("laterLevel5").instanceId, s.inst("laterLevel3").instanceId]);
    expect(s.perm("laterLevel5").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("laterLevel5"), "SecurityAttack")).toBe(-1);
    expect(s.perm("laterLevel3").currentDP).toBe(1000);
    expect(observe(s.engine).keywordAmount(s.perm("laterLevel3"), "SecurityAttack")).toBe(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.playInstances([s.inst("duringTheirTurn").instanceId]);
    expect(s.perm("laterLevel5").currentDP).toBe(5000);
    expect(s.perm("duringTheirTurn").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("duringTheirTurn"), "SecurityAttack")).toBe(-1);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("laterLevel5").currentDP).toBe(8000);
    expect(observe(s.engine).keywordAmount(s.perm("laterLevel5"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("places the attacked opponent Digimon face down at security bottom after trashing Numemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-019", as: "shin", under: [{ card: "RB1-017", as: "numemon" }] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shin").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "RB1-017")).toBe(true);
    expect(s.state.players[1]!.security.at(-1)).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(false);
  });

  it("lets the activating player choose the order of multiple opponent level 3 cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-018", as: "base" }], hand: [{ card: "RB1-019", as: "shin" }] },
        1: {
          battleArea: [
            { card: "RB1-011", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shin").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.decisions.at(-1)!.req;
    expect(ordering.kind).toBe("orderCards");
    expect(ordering.options?.candidateInstanceIds).toEqual([firstId, secondId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: [secondId, firstId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([secondId, firstId]);
  });
});

describe("RB1-019 ShinMonzaemon — KB Q&A rulings", () => {
  it("asks the activating player, not the owner, to order the opponent's level 3 Digimon on security (Q4095)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-018", as: "base" }], hand: [{ card: "RB1-019", as: "shin" }] },
        1: {
          battleArea: [
            { card: "RB1-011", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
          security: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shin").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.decisions.at(-1)!;

    expect(ordering.seat).toBe(0);
    expect(s.decisions.some(({ seat, req }) => seat === 1 && req.kind === "orderCards")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: ordering.req.decisionId,
        response: { kind: "orderCards", order: [secondId, firstId] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.req.decisionId,
        response: { kind: "orderCards", order: [firstId, secondId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 3);

    expect(s.state.players[1]!.security.map((card) => card.instanceId).slice(0, 2)).toEqual([firstId, secondId]);
    expect(s.state.players[1]!.security.at(-1)?.cardId).toBe("BT1-010");
  });
});
