import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT6/BT6-082.js";
import "./BT10-016.js";
import "./BT10-068.js";
import "./BT10-112.js";
import "../BT8/BT8-038.js";
describe("BT10-112 Jesmon GX", () => {
  it("places a Royal Knight under itself, activates its When Digivolving effect, then gains Blitz", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-111", as: "base" }], hand: [{ card: "BT10-112", as: "evolving" }, { card: "BT10-068", as: "royalKnight" }, { card: "BT6-082", as: "sister" }] } }, { autoAcceptOptional: true, autoSelectCards: true }); s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(s.perm("base").stack.some(card => card.instanceId === s.inst("royalKnight").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some(p => p.topCard?.instanceId === s.inst("sister").instanceId)).toBe(true);
  });

  it("activates only the When Digivolving effect of the Royal Knight it just placed from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-111", as: "base", under: [{ card: "BT10-068", as: "oldKnight" }] }],
        hand: [{ card: "BT10-112", as: "evolving" }, { card: "BT6-082", as: "sister" }],
        trash: [{ card: "BT10-016", as: "placedKnight" }],
      },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
      preferInstanceIds: preferred,
    });
    preferred.push(s.inst("placedKnight").instanceId, s.inst("sister").instanceId);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) =>
      permanent.topCard.instanceId === s.inst("sister").instanceId,
    ));

    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("placedKnight").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) =>
      permanent.topCard.instanceId === s.inst("sister").instanceId,
    )).toBe(true);
  });

  it("gains Blocker, Piercing, and Security Attack +1 for each Royal Knight source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "BT10-112",
          as: "gx",
          under: ["BT6-111", "BT10-068"],
        }],
      },
    });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("gx"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("gx"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("gx"), "SecurityAttack")).toBe(2);
  });

  it("does not retain the When Digivolving Blitz grant after the turn ends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-111", as: "base" }],
        hand: [{ card: "BT10-112", as: "evolving" }],
        deck: ["BT1-001"],
      },
      1: { deck: ["BT1-002"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(false);
  });

  it("finishes a real Jesmon GX Blitz attack after borrowing Jesmon X's effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-111", as: "base" }],
        hand: [
          { card: "BT10-112", as: "gx" },
          { card: "BT10-016", as: "jesmonX" },
          { card: "BT6-082", as: "sistermon" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
      1: {
        security: ["BT1-003", "BT1-004", "BT1-005", "BT1-006"],
        deck: ["BT1-007"],
      },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
    });
    s.state.memory = 4;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("gx").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.engine.hasAcceptedBlitzAttack(s.perm("base").permanentId) &&
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.topCard.instanceId === s.inst("sistermon").instanceId,
      ) &&
      s.state.pendingDecision === undefined,
    );
    // Jesmon X and the played Sistermon can still enqueue optional clauses after the
    // Blitz confirmation; let the same production decision loop drain them before attacking.
    await settle(() => false, 100);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.state.memory).toBe(-1);
    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("jesmonX").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("base").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });

    await settle(() => !mainPhase.isOpen);
    await turn;
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.phase).toBe(Phase.End);
  });

  it("borrows Magnamon's unsuspend before exposing the crossed-memory Blitz attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-111", as: "base", suspended: true }],
        hand: [
          { card: "BT10-112", as: "gx" },
          { card: "BT8-038", as: "magnamon" },
        ],
        deck: ["BT1-003"],
      },
      1: { security: ["BT1-001", "BT1-002"], deck: ["BT1-004"] },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
    });
    s.state.memory = 4;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("gx").instanceId,
    })).toEqual({ ok: true });

    await settle(() =>
      !s.perm("base").isSuspended &&
      s.engine.hasAcceptedBlitzAttack(s.perm("base").permanentId) &&
      s.perm("base").canAttackPlayer,
    );
    expect(s.state.memory).toBe(-1);
    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("magnamon").instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("base").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await turn;
  });
});
