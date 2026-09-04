import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-020.js";

describe("EX8-020", () => {
  it("inherits a once-per-turn draw when attacking with seven or fewer cards in hand", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", value: 7 } }],
    }));
  it("registers the DS trait on live Dolphmon state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-020", as: "dolphmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("dolphmon"), "DS")).toBe(true);
  });
  it("draws only once across two attacks at the inclusive seven-card boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "host", under: [{ card: "EX8-020", as: "dolphmon" }] }],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007"],
        deck: ["AD1-001", "AD1-002"],
      },
      1: { security: 2 },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 8);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("does not draw above the seven-card boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "host", under: ["EX8-020"] }],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007", "BT1-008"],
        deck: ["AD1-001"],
      },
      1: { security: 1 },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("uses the off-color level-3 DS route for 1 and rejects a non-DS base", async () => {
    expect(digivolutionRequirementsFor("EX8-020")).toContainEqual({
      level: 3,
      traits: ["DS"],
      cost: 1,
      isAlternate: true,
    });
    const eligible = setupEngine({
      0: { battleArea: [{ card: "EX8-056", as: "syakomon" }], hand: [{ card: "EX8-020", as: "dolphmon" }] },
    });
    eligible.state.memory = 1;
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("syakomon").permanentId,
        instanceId: eligible.inst("dolphmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("syakomon").topCard.instanceId === eligible.inst("dolphmon").instanceId);
    expect(eligible.state.memory).toBe(0);

    const ineligible = setupEngine({
      0: { battleArea: [{ card: "BT2-069", as: "gabumon" }], hand: [{ card: "EX8-020", as: "dolphmon" }] },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("gabumon").permanentId,
        instanceId: ineligible.inst("dolphmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
