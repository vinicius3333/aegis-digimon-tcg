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

  it("grants inherited Security Attack +1 to a Machine host on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-066", as: "machine", under: ["EX1-007"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("machine"), "SecurityAttack")).toBe(true);
  });

  it("checks two security cards in a real attack with Security Attack +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-066", as: "machine", under: ["EX1-007"] }] },
      1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
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
      0: { battleArea: [{ card: "BT2-066", as: "machine", under: ["EX1-007"] }], hand: ["BT1-009"], deck: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-070" }], hand: ["BT1-009"], deck: ["BT1-001"] },
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
