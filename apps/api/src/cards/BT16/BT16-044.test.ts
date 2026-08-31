import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-044.js";
import "../index.js";

describe("BT16-044", () => {
  it("suspends and restricts the same selected opponent Digimon", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "SelectBind",
        target: { bindAs: "suspended" },
        condition: { kind: "securityAtLeast", value: 3 },
      });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Suspend", target: { fromSelectionRef: "suspended" } });
      expect(effect.actions?.[2]).toMatchObject({
        kind: "Restrict",
        target: { fromSelectionRef: "suspended" },
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
      });
      expect(effect.actions?.[3]).toMatchObject({
        kind: "GainMemory",
        amount: 2,
        condition: { kind: "zoneCount", value: 3 },
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
    expect(digivolutionRequirementsFor("BT16-044")).toEqual([
      { level: 4, texts: ["Pulsemon"], cost: 3, isAlternate: true },
    ]);
  });

  it("suspends and restricts the same opponent at exactly three security", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-044", as: "pistmon" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pistmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended && s.state.memory === 2);

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("resolves both independent branches when digivolving at exactly three security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-043", as: "base" }],
          hand: [{ card: "BT16-044", as: "pistmon" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pistmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT16-044");

    expect(s.state.memory).toBe(5);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
  });

  it("naturally pays the inherited security cost and unsuspends after attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-047", as: "host", under: ["BT16-044"], suspended: false }],
          security: ["BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-090"] },
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
    await settle(() => !s.perm("host").isSuspended);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
