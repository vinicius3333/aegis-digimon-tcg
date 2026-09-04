import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-029.js";

describe("EX8-029", () => {
  it("returns opposing Digimon up to total play cost 14 and plays DS cards from digivolution cards when DNA digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { totalPlayCostBudget: 14, upTo: true },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).toMatchObject({
      kind: "PlayMultiple",
      totalCost: 12,
      from: ["digivolutionCards"],
      filter: { hostFilter: { isSelfRef: true } },
      condition: { kind: "isDnaDigivolving" },
    });
  });
  it("grants DS immunity with memory and restricts opposing On Play effects at low memory, plus Aquatic", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions).toMatchObject([
      { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "memoryAtLeast", value: 1 } },
      { kind: "Aura", while: { kind: "memoryAtMost", value: 1 } },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      tokens: ["Aquatic"],
    });
  });

  it("disables opposing On Play effects only at 1 or less memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-029", as: "aegisdramon" }] },
      1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
    });
    await s.ready();

    s.state.memory = 1;
    await advance(s.engine).recompute();
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "activateOnPlay"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "activateOnPlay")).toBe(true);

    s.state.memory = 2;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "activateOnPlay")).toBe(false);
  });

  it("evaluates both memory thresholds from Aegisdramon's side off-turn (Q3898–Q3899)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-029", as: "aegisdramon" },
          { card: "EX8-020", as: "ds" },
          { card: "AD1-001", as: "nonDs" },
        ],
      },
      1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = -1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).isRestricted(s.perm("opponent"), "activateOnPlay")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ds"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("nonDs"), "beAffected", "Digimon")).toBe(false);

    s.state.memory = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "activateOnPlay")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ds"), "beAffected", "Digimon")).toBe(false);

    s.state.memory = -2;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "activateOnPlay")).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ds"), "beAffected", "Digimon")).toBe(true);
  });

  it("plays DS cards only from the DNA result's own sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX8-026",
              as: "metal",
              under: [
                { card: "EX8-020", as: "own" },
                { card: "EX8-024", as: "middle" },
              ],
            },
          ],
          breeding: { card: "BT1-037", as: "other", under: [{ card: "EX8-017", as: "foreign" }] },
          hand: [
            { card: "EX8-027", as: "plesiomon" },
            { card: "EX8-029", as: "aegis" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("plesiomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("own").instanceId),
    );

    expect(s.state.players[0]!.breeding?.stack.some((card) => card.instanceId === s.inst("foreign").instanceId)).toBe(
      true,
    );
  });
});
