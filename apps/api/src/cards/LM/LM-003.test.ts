import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-003.js";

describe("LM-003 TeslaJellymon", () => {
  it("trashes a blue card to survive a losing battle for the turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-003", as: "attacker", dp: 4000 }], hand: [{ card: "BT1-029", as: "blueCost" }] },
        1: { battleArea: [{ card: "BT1-010", as: "defender", dp: 5000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blueCost").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blueCost").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
  });

  it("is deleted when the optional trash cost is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-003", as: "attacker", dp: 4000 }], hand: [{ card: "BT1-029", as: "blueCost" }] },
        1: { battleArea: [{ card: "BT1-010", as: "defender", dp: 5000, suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== attackerId), 2000);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blueCost").instanceId)).toBe(false);
  });

  it("cannot pay the cost with a non-blue hand card, so the battle deletes it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-003", as: "attacker", dp: 4000 }], hand: [{ card: "BT1-020", as: "redCard" }] },
        1: { battleArea: [{ card: "BT1-010", as: "defender", dp: 5000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== attackerId), 2000);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("redCard").instanceId)).toBe(false);
  });

  it("survives a losing Security Digimon battle too, per Q3991", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-003", as: "attacker", dp: 4000 }], hand: [{ card: "BT1-029", as: "blueCost" }] },
        // Titamon is a printed 12000 DP Security Digimon, so the attacker loses the battle.
        1: { security: [{ card: "BT1-080" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "player" },
    });
    await settle(() => s.state.players[1]!.security.length === 0, 2000);

    expect(observe(s.engine).isRestricted(attackerId, "beDeletedInBattle")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
  });

  it("loses battle immunity after its own turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-003", as: "attacker", dp: 4000 }],
          hand: [{ card: "BT1-029", as: "blueCost" }, "BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "opponent", dp: 5000, suspended: true }],
          deck: ["BT1-009"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isRestricted(s.perm("attacker").permanentId, "beDeletedInBattle")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attacker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    advance(s.engine).endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("is still deleted by Retaliation, which is effect deletion rather than battle deletion, per Q3992", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-003", as: "attacker", dp: 6000 }], hand: [{ card: "BT1-029", as: "blueCost" }] },
        1: { battleArea: [{ card: "BT2-074", as: "retaliation", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("retaliation").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== attackerId), 2000);

    // Retaliation deletes by effect (Q3992), so the battle-only grant cannot save it;
    // once the permanent leaves play its temporary grant is no longer observable either.
    expect(observe(s.engine).isRestricted(attackerId, "beDeletedInBattle")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
  });

  it("draws from the inherited effect at seven cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-004", as: "host", under: ["LM-003"], dp: 7000 }],
          hand: ["BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029"],
          deck: ["BT1-027"],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 8);

    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("draws only once from two inherited copies at seven cards, per Q3993", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-004", as: "host", under: ["LM-003", "LM-003"], dp: 7000 }],
          hand: ["BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029"],
          deck: ["BT1-027", "BT1-028"],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length >= 8, 2000);

    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-003");
    const compiled = runtimeCompiledCard("LM-003");
    expect(definition?.nameEn).toBe("TeslaJellymon");
    expect(definition?.dp).toBe(4000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
