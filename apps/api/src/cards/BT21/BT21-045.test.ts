import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-045.js";
import "../index.js";

describe("BT21-045 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("preserves Raid and both alternate Digivolution requirements", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] }),
    );
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["RizeGreymon"], cost: 3, isAlternate: true },
      { traits: ["Hero"], cost: 3, isAlternate: true, level: 5 },
    ]);
  });

  it("shares one once-per-turn deletion budget between digivolving and attacking", () => {
    const deletionEffects = compiled.effects.filter((effect) => effect.actions?.[0]?.kind === "Delete");
    expect(deletionEffects).toHaveLength(2);
    expect(deletionEffects[0]).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
    expect(deletionEffects[1]).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
    for (const effect of deletionEffects) {
      expect(effect.actions).toEqual([
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 9000 } }, count: 1 },
          optional: true,
        },
      ]);
    }
  });

  it("requires one suspended red or yellow Tamer for the combined Security Attack and DP gain", () => {
    const attack = compiled.effects.find(
      (effect) => effect.trigger === "WhenAttacking" && effect.actions?.[0]?.kind === "GainKeyword",
    );
    expect(attack).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(attack?.actions).toEqual([
      {
        kind: "GainKeyword",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
        duration: "forTheTurn",
        cost: {
          kind: "suspend",
          target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] }, count: 1 },
          raw: "By suspending 1 of your yellow or red Tamers",
        },
        optional: true,
        abortOnDecline: true,
      },
      {
        kind: "ModifyDP",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        amount: 3000,
        duration: "forTheTurn",
      },
    ]);
  });

  it("enters through the public play intent with its Once Per Turn attack clauses registered", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-045", as: "shinegreymon" }] } });
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shinegreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("shinegreymon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("shinegreymon").instanceId),
    ).toBe(true);
  });

  it("gains Security Attack and 3000 DP by suspending a red Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-045", as: "shinegreymon" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("shinegreymon").currentDP;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("shinegreymon"));
    await settle(
      () => s.perm("tamer").isSuspended && observe(s.engine).hasKeyword(s.perm("shinegreymon"), "SecurityAttack"),
    );

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("shinegreymon").currentDP).toBe(baseDP + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("shinegreymon"), "SecurityAttack")).toBe(true);
  });

  it("naturally pays the Tamer suspension cost during a public security attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-045", as: "shine" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended && s.state.players[1]!.security.length === 0);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("shine").currentDP).toBe(15000);
  });

  it("deletes at the 9000 DP boundary and shares the budget with When Attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-045", as: "shine" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atBoundary", dp: 9000 },
            { card: "BT1-010", as: "second", dp: 8000 },
            { card: "BT1-011", as: "tooLarge", dp: 10000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("atBoundary").topCard.instanceId, s.perm("second").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shine"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("atBoundary").instanceId));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("shine"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("second").permanentId,
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("tooLarge").permanentId,
    );
  });

  it("deletes the lowest-DP opponent naturally on a public RizeGreymon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-044", as: "rizegreymon" }],
          hand: [{ card: "BT21-045", as: "shine" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-010", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowestId = s.perm("lowest").permanentId;
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rizegreymon").permanentId,
        instanceId: s.inst("shine").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rizegreymon").topCard.cardId === "BT21-045");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId)).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("higher").permanentId),
    ).toBe(true);
  });

  it("does not pay the attack cost or grant bonuses without an eligible Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-045", as: "shine" },
            { card: "BT8-087", as: "blueTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const baseDp = s.perm("shine").currentDP;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("shine"));

    expect(s.perm("blueTamer").isSuspended).toBe(false);
    expect(s.perm("shine").currentDP).toBe(baseDp);
    expect(observe(s.engine).hasKeyword(s.perm("shine"), "SecurityAttack")).toBe(false);
  });

  it("uses Raid to redirect a player attack to the opponent's highest-DP unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-045", as: "shine" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "raidTarget", dp: 13000 }],
          security: [{ card: "BT1-010", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("shine").instanceId));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("raidTarget").permanentId),
    ).toBe(true);
  });
});
