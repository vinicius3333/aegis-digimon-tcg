import { describe, expect, it } from "vitest";
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
});
