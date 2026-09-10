import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-007.js";

describe("EX1-007 Megadramon", () => {
  it("deletes up to 2 opposing Digimon with 3000 DP or less on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX1-007", as: "megadramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "small1", dp: 3000 },
            { card: "BT1-010", as: "small2", dp: 2000 },
            { card: "BT1-011", as: "large", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 2);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("large").permanentId);
  });

  it("resolves the up-to delete with zero eligible targets", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX1-007", as: "megadramon" }] },
        1: { battleArea: [{ card: "BT1-011", as: "large", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX1-007"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("allows choosing fewer than the two eligible opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX1-007", as: "megadramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "small1", dp: 3000 },
            { card: "BT1-010", as: "small2", dp: 2000 },
            { card: "BT1-011", as: "large", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.options).toMatchObject({ min: 0, max: 2 });
    expect(decision.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("small1").permanentId, s.perm("small2").permanentId]),
    );
    expect(decision.options?.candidateInstanceIds).not.toContain(s.perm("large").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("small1").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("small1").instanceId));
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("small2").instanceId,
      s.inst("large").instanceId,
    ]);
  });

  it.each([
    ["red", "BT1-014"],
    ["black", "BT2-058"],
  ])("digivolves from a legal %s level-4 source and keeps that source in the stack", async (_color, sourceCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: sourceCard, as: "source" }],
        hand: [{ card: "EX1-007", as: "evo" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX1-007");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual([sourceCard]);
    expect(s.perm("source").topCard.cardId).toBe("EX1-007");
    expect(s.state.memory).toBe(2);
  });

  it("rejects an otherwise red but level-3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "invalidSource" }],
        hand: [{ card: "EX1-007", as: "evo" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-010");
    expect(s.state.memory).toBe(5);
  });

  it("grants inherited Security Attack +1 to a Machine host on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-066", as: "machine", under: ["EX1-007"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("machine"), "SecurityAttack")).toBe(true);
  });

  it("checks two security cards in a real attack with Security Attack +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-066", as: "machine", under: ["EX1-007"] }] },
      1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
  });

  it("does not grant Security Attack +1 to a non-Machine host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-025", as: "host", under: ["EX1-007"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(false);
  });

  it("does not grant the inherited keyword during the opponent turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-066", as: "machine", under: ["EX1-007"] }], hand: ["BT1-009"], deck: ["BT1-010"] },
      1: { battleArea: [{ card: "BT1-070" }], hand: ["BT1-009"], deck: ["BT1-010"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("machine"), "SecurityAttack")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
