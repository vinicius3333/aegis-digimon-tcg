import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-021.js";

describe("EX8-021", () => {
  it("gains 1 memory once per turn as a top card and inherits Jamming", () => {
    const whenAttacking = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(whenAttacking).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
    expect(whenAttacking?.isInherited).not.toBe(true);
    expect(compiled.effects?.find((entry) => entry.keywords !== undefined)?.keywords).toContainEqual({
      keyword: "Jamming",
      raw: "＜Jamming＞",
    });
  });
  it("exposes inherited Jamming on a live host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-038", as: "host", under: [{ card: "EX8-021", as: "seadramon" }] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
  it("gains memory only once across two attacks as the live top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-021", as: "seadramon" }] }, 1: { security: 2 } });
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    await advance(s.engine).verb.unsuspend([s.perm("seadramon").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(1);
  });

  it("does not inherit the memory effect but inherited Jamming survives security battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-038", dp: 1000, as: "host", under: ["EX8-021"] }] },
      1: { security: ["EX8-015"] },
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
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("uses the off-color level-3 DS route for 2 and rejects a non-DS base", async () => {
    expect(digivolutionRequirementsFor("EX8-021")).toContainEqual({
      level: 3,
      traits: ["DS"],
      cost: 2,
      isAlternate: true,
    });
    const eligible = setupEngine({
      0: { battleArea: [{ card: "EX8-056", as: "syakomon" }], hand: [{ card: "EX8-021", as: "seadramon" }] },
    });
    eligible.state.memory = 2;
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("syakomon").permanentId,
        instanceId: eligible.inst("seadramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("syakomon").topCard.instanceId === eligible.inst("seadramon").instanceId);
    expect(eligible.perm("syakomon").topCard.cardId).toBe("EX8-021");
    expect(eligible.perm("syakomon").stack.map((card) => card.instanceId)).toContain(
      eligible.inst("syakomon").instanceId,
    );
    expect(eligible.state.memory).toBe(0);

    const ineligible = setupEngine({
      0: { battleArea: [{ card: "BT2-069", as: "gabumon" }], hand: [{ card: "EX8-021", as: "seadramon" }] },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("gabumon").permanentId,
        instanceId: ineligible.inst("seadramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
