import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../../cards/index.js";

describe("AD1-014 MetalGarurumon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-014");
    const compiled = registeredCompiledCards.get("AD1-014") ?? getCompiledCard("AD1-014");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-014");
    expect(definition?.nameEn).toBe("MetalGarurumon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("deletes one opposing level-five-or-lower Digimon on play and leaves a higher level intact", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-014", as: "metal" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "low" },
            { card: "AD1-014", as: "high" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("high").permanentId);
  });

  it("restricts one opposing permanent for every two distinct Tamer colors", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "AD1-014", as: "metal" }],
          battleArea: [
            { card: "AD1-020", as: "three-colors" },
            { card: "ST6-14", as: "purple" },
          ],
        },
        1: {
          battleArea: [
            { card: "AD1-014", as: "target-a" },
            { card: "AD1-014", as: "target-b" },
            { card: "AD1-014", as: "untargeted" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    const continuous = (
      s.engine as unknown as { continuous: { hasRestriction(id: string, restriction: string): boolean } }
    ).continuous;
    await settle(
      () =>
        s.state.players[1]!.battleArea.filter((permanent) =>
          continuous.hasRestriction(permanent.permanentId, "suspend"),
        ).length === 2,
    );

    expect(
      s.state.players[1]!.battleArea.filter((permanent) => continuous.hasRestriction(permanent.permanentId, "suspend")),
    ).toHaveLength(2);
  });

  it("does not create a suspension restriction with fewer than two Tamer colors", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-014", as: "metal" }], battleArea: [{ card: "BT1-086", as: "blue-tamer" }] },
        1: { battleArea: [{ card: "AD1-014", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle();
    const continuous = (
      s.engine as unknown as { continuous: { hasRestriction(id: string, restriction: string): boolean } }
    ).continuous;
    expect(continuous.hasRestriction(s.perm("target").permanentId, "suspend")).toBe(false);
  });

  it("unsuspends once when one of its Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-014", as: "metal", suspended: true },
            { card: "BT1-010", as: "attacker" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metal").isSuspended === false);
    expect(s.perm("metal").isSuspended).toBe(false);
  });

  it("uses all three printed alternate level-5 routes for cost 3", async () => {
    for (const baseCard of ["BT1-040", "ST21-04", "AD1-011"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "AD1-014", as: "metal" }] },
      });
      s.state.memory = 5;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("metal").instanceId,
          alternateRequirementIndex: baseCard === "BT1-040" ? 0 : 1,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "AD1-014");
      expect(s.state.memory).toBe(2);
    }
  });

  it("publishes Blocker and Evade", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-014", as: "metal" }] } });
    await s.ready();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("metal").permanentId, "Blocker")).toBe(true);
    expect(continuous.hasKeyword(s.perm("metal").permanentId, "Evade")).toBe(true);
  });

  it("applies its inherited restriction only when the host name contains Garurumon or Omnimon", async () => {
    const matching = setupEngine({
      0: { battleArea: [{ card: "BT1-040", as: "host", under: ["AD1-014"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });
    await matching.ready();
    expect(
      matching.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: matching.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(matching.engine).isRestricted(matching.perm("target"), "suspend"));
    expect(observe(matching.engine).isRestricted(matching.perm("target"), "suspend")).toBe(true);

    const nonMatching = setupEngine({
      0: { battleArea: [{ card: "AD1-006", as: "host", under: ["AD1-014"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });
    await nonMatching.ready();
    expect(
      nonMatching.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: nonMatching.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(observe(nonMatching.engine).isRestricted(nonMatching.perm("target"), "suspend")).toBe(false);
  });
});
