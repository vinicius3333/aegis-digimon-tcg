import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-059.js";
import "../index.js";

describe("BT16-059", () => {
  it("de-digivolves under three security and deletes a play-cost 6 or lower Digimon under three security", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "DeDigivolve",
        amount: 1,
        condition: { kind: "securityAtLeast", value: 3 },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Delete",
        target: { filter: { playCostLte: 6 } },
        condition: { kind: "securityAtMost", value: 3 },
      });
    }
  });

  it("has the inherited Pulsemon security-cost unsuspend", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash" },
    });
  });

  it("activates de-digivolution and low-cost deletion at exactly three security", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-059", as: "shoot" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
        1: {
          battleArea: [
            { card: "BT16-048", as: "high", under: ["BT1-009"] },
            { card: "BT1-009", as: "low" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoot").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // At exactly 3 security both clauses apply: the ＜De-Digivolve 1＞ trashes the stacked
    // Digimon's top card, and the deletion then removes one play-cost-6-or-less Digimon —
    // either survivor qualifies, so assert the de-digivolution and the net board instead.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT16-048")).toBe(true);
  });

  it("naturally unsuspends its Pulsemon-text host after attacking by trashing top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-055", as: "host", under: ["BT16-059"] }],
          security: ["BT1-001", "BT1-002"],
        },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const securityBefore = s.state.players[0]!.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended && s.state.players[0]!.security.length === securityBefore - 1);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore - 1);
  });
});
