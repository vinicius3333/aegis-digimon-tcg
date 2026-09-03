import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-034.js";
import "../index.js";

describe("BT16-034", () => {
  it("reduces an opposing Digimon by 4000 when security is at least 3", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -4000,
        duration: "untilOpponentTurnEnd",
        condition: { kind: "securityAtLeast", value: 3 },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "SecurityAttack", amount: -2 },
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
      cost: { kind: "trash", target: { filter: { zone: "security", position: "top" } } },
    });
  });

  it("uses the security-count boundary at exactly 3", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-034", as: "tempo" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tempo").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack") === -2);

    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-2);
    expect(s.perm("opponent").currentDP).toBe(1000);
  });

  it("at 2 security applies only Security Attack -2", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-034", as: "tempo" }], security: ["BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tempo").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack") === -2);

    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-2);
    expect(s.perm("opponent").currentDP).toBe(5000);
  });

  it("unsuspends an inherited Tempomon after trashing its security cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-043", as: "tempo", under: ["BT16-034"] }],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tempo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("tempo").isSuspended && s.state.players[0]!.security.length === 0);

    expect(s.perm("tempo").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("does not use the inherited effect when the current top card lacks Pulsemon text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-035", as: "slash", under: ["BT16-034"] }],
          security: ["BT1-009"],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("slash").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("slash").isSuspended);

    expect(s.perm("slash").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("evolves from a level 4 with Pulsemon in its text for 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-043", as: "runner" }],
        hand: [{ card: "BT16-034", as: "tempo" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("runner").permanentId,
        instanceId: s.inst("tempo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("runner").topCard?.cardId === "BT16-034");

    expect(s.perm("runner").stack.map((card) => card.cardId)).toEqual(["BT16-043"]);
    expect(s.state.memory).toBe(0);
  });

  it("encodes the Pulsemon-text level-4 evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT16-034")).toEqual([
      { level: 4, texts: ["Pulsemon"], cost: 3, isAlternate: true },
    ]);
  });
});
