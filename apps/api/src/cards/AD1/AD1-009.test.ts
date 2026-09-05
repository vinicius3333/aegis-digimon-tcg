import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "../../cards/index.js";

describe("AD1-009 BlitzGreymon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-009");
    const compiled = registeredCompiledCards.get("AD1-009") ?? getCompiledCard("AD1-009");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-009");
    expect(definition?.nameEn).toBe("BlitzGreymon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("de-digivolves three sources on play and grants the same-turn Garurumon protection", async () => {
    const compiled = registeredCompiledCards.get("AD1-009") ?? getCompiledCard("AD1-009");
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "AD1-009", as: "blitz" }],
          battleArea: [{ card: "BT1-040", as: "garurumon" }],
        },
        1: { battleArea: [{ card: "ST6-08", as: "stacked", under: ["BT1-010", "BT1-009", "BT1-020"] }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blitz").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("stacked").stack.length === 1);

    expect(s.perm("stacked").stack).toHaveLength(1);
    expect(compiled?.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      expect.anything(),
      { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", duration: "untilOpponentTurnEnd" },
      { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", duration: "untilOpponentTurnEnd" },
    ]);
  });

  it("protects only itself and one friendly Garurumon from opponent Digimon effects", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "AD1-009", as: "blitz" }],
        battleArea: [
          { card: "BT1-036", as: "garurumon" },
          { card: "BT1-010", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blitz").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "AD1-009"));

    expect(observe(s.engine).hasRestriction(s.perm("blitz"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("garurumon"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("other"), "beAffected", "Digimon")).toBe(false);
  });

  it("expires both protections when the opponent's turn ends", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "AD1-009", as: "blitz" }],
        battleArea: [{ card: "BT1-040", as: "garurumon" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blitz").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "AD1-009"));
    expect(observe(s.engine).hasRestriction(s.perm("blitz"), "beAffected", "Digimon")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasRestriction(s.perm("blitz"), "beAffected", "Digimon")).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("garurumon"), "beAffected", "Digimon")).toBe(false);
  });

  it("uses either printed alternate level-5 route for cost 3", async () => {
    for (const baseCard of ["BT1-021", "ST21-04"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "AD1-009", as: "blitz" }] },
      });
      s.state.memory = 5;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("blitz").instanceId,
          alternateRequirementIndex: baseCard === "BT1-021" ? 0 : 1,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "AD1-009");
      expect(s.state.memory).toBe(2);
    }
  });

  it("may attack at end of turn even when DNA digivolution is unavailable (Q6075)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "AD1-009", as: "blitz" }] }, 1: { security: ["BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await advance(s.engine).runTurn(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("may attack with the unsuspended Omnimon Alter-S after DNA digivolving (Q6074)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-009", as: "blitz" },
            { card: "AD1-012", as: "cres" },
          ],
          hand: [{ card: "EX4-060", as: "alter-s" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX4-060");
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("uses Alliance and Piercing in the same battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-009", as: "blitz" },
            { card: "BT1-010", as: "ally", dp: 3000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 13000, suspended: true }], security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blitz").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0, 5000);

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("provides inherited Security Attack +1 to its host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "host", under: ["AD1-009"] }] },
      1: { security: ["BT1-009", "BT1-009"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 20000);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
