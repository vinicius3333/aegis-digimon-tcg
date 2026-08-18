import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT10/BT10-041.js";
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
          security: ["BT1-001"],
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
          security: ["BT1-001"],
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

  it("still resolves its gained When Attacking effect after the attacker digivolves (Q969)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-041", as: "attacker" }],
          hand: [
            { card: "BT1-104", as: "option" },
            { card: "BT5-044", as: "sakuyamon" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-016", as: "dpTarget", dp: 5000 }],
          security: ["BT1-001"],
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
    await settle(() => s.perm("attacker").topCard?.cardId === "BT5-044" && s.perm("dpTarget").currentDP === 3000);

    expect(s.perm("attacker").topCard?.cardId).toBe("BT5-044");
    expect(s.perm("dpTarget").currentDP).toBe(3000);
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
