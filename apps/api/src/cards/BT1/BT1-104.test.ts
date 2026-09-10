import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT1-104.js";

describe("BT1-104 Golden Ripper", () => {
  it("matches official metadata and registers fully covered IR", () => {
    expect(getCardDefinition("BT1-104")).toMatchObject({
      nameEn: "Golden Ripper",
      colors: ["Yellow"],
      kinds: ["Option"],
      playCost: 3,
      effectText: expect.stringContaining("[When Attacking]"),
    });
    expect(compiled).toEqual(getCompiledCard("BT1-104"));
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("affects a Digimon that enters after the Option resolves (Q967/Q970)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-087"], hand: [{ card: "BT1-104", as: "option" }] },
        1: {
          battleArea: [{ card: "BT1-016", as: "dpTarget", dp: 5000 }],
          security: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-104"));

    const lateAttacker = s.putOnBoard(0, { card: "ST3-02", as: "lateAttacker" });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: lateAttacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("dpTarget").currentDP === 3000);
    expect(s.perm("dpTarget").currentDP).toBe(3000);
  });

  it("stacks two copies as two independent -2000 DP triggers (Q971)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-087", { card: "ST3-02", as: "attacker" }],
          hand: [
            { card: "BT1-104", as: "first" },
            { card: "BT1-104", as: "second" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-016", as: "dpTarget", dp: 7000 }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    for (const alias of ["first", "second"]) {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-104").length === (alias === "first" ? 1 : 2),
      );
    }

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("dpTarget").currentDP === 3000);
    expect(s.perm("dpTarget").currentDP).toBe(3000);
  });

  it("resolves its gained When Attacking effect on the active attacker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-087", { card: "BT1-081", as: "attacker" }],
          hand: [{ card: "BT1-104", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT1-016", as: "dpTarget", dp: 5000 }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-104"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dpTarget").currentDP === 3000);
    expect(s.perm("dpTarget").currentDP).toBe(3000);
  });

  it("keeps the gained effect on an attacker reached by public hatch, evolution, and move", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-005", as: "egg" }],
          hand: [
            { card: "ST3-02", as: "lv3" },
            { card: "BT1-053", as: "lv4" },
            { card: "BT1-104", as: "option" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-016", as: "dpTarget", dp: 5000 }],
          security: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-005");
    const permanentId = s.state.players[0]!.breeding!.permanentId;
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("lv3").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("lv3").instanceId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("lv4").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("lv4").instanceId);
    expect(s.state.players[0]!.breeding!.stack.map(({ cardId }) => cardId)).toEqual(["BT1-005", "ST3-02"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.permanentId === permanentId));
    await advance(s.engine).waitForMainPhase(0);

    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-104"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dpTarget").currentDP === 3000);
    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === permanentId)!.stack).toHaveLength(2);
    expect(s.perm("dpTarget").currentDP).toBe(3000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("has no Security effect and is simply trashed after the check (Q968)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "attacker", dp: 5000 }],
      },
      1: {
        security: [{ card: "BT1-104", as: "securityOption" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
