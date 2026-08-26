import { compiledEffects, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-037.js";

describe("BT11-037 Kotemon", () => {
  it("matches the catalog and publishes exact Blocker and turn restriction contracts", () => {
    expect(getCardDefinition("BT11-037")).toMatchObject({
      cardId: "BT11-037",
      nameEn: "Kotemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 4,
      dp: 3000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Reptile"],
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
        {
          trigger: "YourTurn",
          actions: [{ kind: "Restrict", restriction: "attackPlayers", duration: "permanent" }],
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(compiledEffects["BT11-037"]).toEqual(compiled);
  });

  it("has Blocker and can't attack players on its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-037", as: "kotemon" }] },
      1: { security: ["BT1-001"] },
    });

    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("kotemon"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("kotemon"), "attackPlayers")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kotemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("the player-attack restriction is absent outside its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-037", as: "kotemon" }] } });
    s.state.turnSeat = 1;

    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("kotemon"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("kotemon"), "attackPlayers")).toBe(false);
  });

  it("can attack an opposing suspended Digimon as Q2071 requires", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-037", as: "kotemon" }] },
      1: { battleArea: [{ card: "BT11-023", as: "target", suspended: true }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kotemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));
    expect(s.events.some(({ kind }) => kind === "securityChecked")).toBe(false);
  });

  it("uses Blocker to redirect a real opposing player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-037", as: "kotemon" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-028", as: "attacker", dp: 6000 }] },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("kotemon").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("evolves from a yellow level 2 for 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-003", as: "base" }],
        hand: [{ card: "BT11-037", as: "kotemon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kotemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-037");
    expect(s.state.memory).toBe(2);
  });
});
