import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
});
