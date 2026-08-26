import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
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

    expect(observe(s.engine).isRestricted(attackerId, "beDeletedInBattle")).toBe(true);
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
        1: { security: 2 },
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
        1: { security: 2 },
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
