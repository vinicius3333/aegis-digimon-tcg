import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-012 CresGarurumon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-012");
    const compiled = registeredCompiledCards.get("AD1-012") ?? getCompiledCard("AD1-012");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-012");
    expect(definition?.nameEn).toBe("CresGarurumon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("returns exactly one opposing lowest-level Digimon to its owner's hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "AD1-012", as: "cres" }],
          battleArea: [{ card: "AD1-001", as: "greymon", suspended: true }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lowest" },
            { card: "AD1-001", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cres").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("higher").permanentId);
    expect(s.perm("greymon").isSuspended).toBe(false);
  });

  it("returns the lowest-level Digimon and unsuspends itself plus Greymon when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-012", as: "cres" },
            { card: "AD1-001", as: "greymon", suspended: true },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lowest" },
            { card: "AD1-001", as: "higher" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cres").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.perm("cres").isSuspended).toBe(false);
    expect(s.perm("greymon").isSuspended).toBe(false);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("shares the once-per-turn return and unsuspend effect across play and attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-012", as: "cres" },
            { card: "AD1-001", as: "greymon", suspended: true },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "AD1-001", as: "second" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cres"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cres").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("redirects an opposing attack even when the optional DNA digivolution is unavailable", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-012", as: "cres", dp: 12000 }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 6000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("cres").permanentId),
    ).toBe(true);
  });

  it("DNA digivolves into Omnimon Alter-S before resolving its optional attack redirection", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-012", as: "cres", dp: 12000 },
            { card: "AD1-009", as: "blitz", dp: 12000 },
          ],
          hand: [{ card: "EX4-060", as: "alter-s" }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX4-060"),
      5000,
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX4-060");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("uses either printed alternate level-5 route for cost 3", async () => {
    for (const baseCard of ["BT1-040", "ST21-04"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "AD1-012", as: "cres" }] },
      });
      s.state.memory = 5;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("cres").instanceId,
          alternateRequirementIndex: baseCard === "BT1-040" ? 0 : 1,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "AD1-012");
      expect(s.state.memory).toBe(2);
    }
  });

  it("publishes Alliance, Evade, and inherited attack-target protection", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "AD1-012", as: "cres" },
          { card: "EX4-060", as: "host", under: ["AD1-012"] },
        ],
      },
    });
    await s.ready();
    const continuous = (
      s.engine as unknown as {
        continuous: {
          hasKeyword(id: string, keyword: string): boolean;
          hasRestriction(id: string, restriction: string): boolean;
        };
      }
    ).continuous;

    expect(continuous.hasKeyword(s.perm("cres").permanentId, "Alliance")).toBe(true);
    expect(continuous.hasKeyword(s.perm("cres").permanentId, "Evade")).toBe(true);
    expect(continuous.hasRestriction(s.perm("host").permanentId, "attackTargetChange")).toBe(true);
  });
});
