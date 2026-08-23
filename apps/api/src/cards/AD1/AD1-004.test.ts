import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "../../cards/index.js";

describe("AD1-004 WarGreymon", () => {
  it("deletes an opposing Digimon within its DP ceiling when played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-004", as: "wargreymon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("allows Greymon-name, ADVENTURE, and Hero level-5 digivolution routes for cost 3", async () => {
    for (const baseCardId of ["BT1-021", "ST20-04", "AD1-011"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "AD1-004", as: "wargreymon" }],
          deck: ["BT1-001"],
        },
      });
      s.state.memory = 3;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("wargreymon").instanceId,
          alternateRequirementIndex: baseCardId === "BT1-021" ? 0 : 1,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "AD1-004");

      expect(s.perm("base").topCard?.cardId).toBe("AD1-004");
      expect(s.state.memory).toBe(0);
    }
  });

  it("gets +1000 DP per distinct Tamer color and Security Attack +1 per three colors", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "AD1-004", dp: 12000, as: "wargreymon" },
          { card: "AD1-020", as: "threeColorTamer" },
        ],
      },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await s.ready();

    expect(s.perm("wargreymon").currentDP).toBe(15000);
    expect(observe(s.engine).keywordAmount(s.perm("wargreymon"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wargreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1, 5000);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("has no Security Attack bonus with only two distinct Tamer colors", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "AD1-004", dp: 12000, as: "wargreymon" },
          { card: "AD1-019", as: "twoColorTamer" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("wargreymon").currentDP).toBe(14000);
    expect(observe(s.engine).keywordAmount(s.perm("wargreymon"), "SecurityAttack")).toBe(0);
  });

  it("may make one of its Digimon attack at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-004", as: "wargreymon" },
            { card: "BT1-010", as: "attacker" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).runTurn(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("uses Raid and Piercing to redirect, win battle, and continue security checks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-004", dp: 12000, as: "wargreymon" }] },
        1: { battleArea: [{ card: "BT1-010", dp: 6000, as: "raidTarget" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wargreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("inherits one DP-relative deletion for a Greymon-name attacker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-021", dp: 7000, as: "attacker", under: ["AD1-004"] }] },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 7000, as: "eligible" },
            { card: "BT1-010", dp: 8000, as: "tooLarge" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tooLarge").permanentId),
    ).toBe(true);
  });

  it("activates but cannot delete when inherited by a non-Greymon or Omnimon attacker, per Q6055", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-011", dp: 8000, as: "attacker", under: ["AD1-004"] }] },
        1: { battleArea: [{ card: "BT1-010", dp: 3000, as: "wouldBeEligible" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.permanentId === s.perm("wouldBeEligible").permanentId,
      ),
    ).toBe(true);
  });

  it("rejects play when memory is below the printed cost", () => {
    const s = setupEngine({ 0: { hand: [{ card: "AD1-004", as: "wargreymon" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargreymon").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-004");
    const compiled = registeredCompiledCards.get("AD1-004") ?? getCompiledCard("AD1-004");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-004");
    expect(definition?.nameEn).toBe("WarGreymon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });
});
