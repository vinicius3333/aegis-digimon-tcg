import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { getCardDefinition } from "@aegis/shared";
import "./index.js";
import { compiled } from "./EX8-029.js";

describe("EX8-029", () => {
  it("matches committed catalog identity and every printed text field", () => {
    expect(getCardDefinition("EX8-029")).toMatchObject({
      cardId: "EX8-029",
      nameEn: "Aegisdramon",
      colors: ["Blue", "Black", "Yellow"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [
        { color: "Blue", level: 6, memoryCost: 5 },
        { color: "Black", level: 6, memoryCost: 5 },
        { color: "Yellow", level: 6, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Cyborg", "DS", "Aquatic"],
      effectText:
        "[When Digivolving] Return up to 14 play cost's total worth of your opponent's Digimon to the bottom of the deck. If DNA digivolving, you may play up to 12 play cost's total worth of [DS]\u00a0trait cards from this Digimon's digivolution cards without paying the costs.\n[All Turns] While you have 1 or more memory, none of your [DS]\u00a0trait Digimon are affected by your opponent's Digimon's effects. While you have 1 or less, none of your opponent's Digimon can activate [On Play] effects.\n[Rule] Trait: Has the [Aquatic] type.",
    });
    expect(getCardDefinition("EX8-029")?.inheritedEffectText).toBeUndefined();
  });

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
    const allTurns = compiled.effects?.filter((entry) => entry.trigger === "AllTurns") ?? [];
    expect(allTurns).toHaveLength(2);
    expect(allTurns[0]?.actions).toMatchObject([
      { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "memoryAtLeast", value: 1 } },
    ]);
    expect(allTurns[1]).toMatchObject({
      condition: { kind: "memoryAtMost", value: 1, controller: "mine" },
      actions: [
        {
          kind: "DisableTimingEffect",
          whileMatchesTargetFilter: true,
          timings: ["onPlay"],
          duration: "permanent",
          target: { count: "all", filter: { controller: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
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
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("opponent"), "onPlay"));
    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "onPlay")).toBe(true);

    s.state.memory = 2;
    await advance(s.engine).recompute();
    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "onPlay")).toBe(false);
  });

  it("blocks a real opposing On Play draw at low memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-029", as: "aegisdramon" }] },
      1: {
        hand: [{ card: "BT1-029", as: "gabumon" }],
        deck: ["AD1-001", "AD1-002"],
      },
    });
    await s.ready();

    // Memory is signed from the turn player's perspective. At +3 on seat 1's turn,
    // Aegisdramon's controller is at -3, which is inside the printed <=1 window.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).recompute();
    const deckBefore = s.state.players[1]!.deck.length;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gabumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-029"));

    expect(s.state.players[1]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-029")).toBe(true);
  });

  it("prevents an opponent Digimon effect from suspending DS while at least 1 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-029", as: "aegisdramon" },
          { card: "EX8-020", as: "ds" },
          { card: "AD1-001", as: "nonDs" },
        ],
      },
      1: { battleArea: [{ card: "BT1-029", as: "opponent" }] },
    });
    await s.ready();
    s.state.memory = 1;
    await advance(s.engine).recompute();

    // This is the production effect-resolution seam used by a real opposing Digimon
    // effect; only the DS permanent should be immune to the suspend operation.
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"], s.perm("opponent").permanentId);
    await driver.verb.suspend([s.perm("ds").permanentId, s.perm("nonDs").permanentId], 1);
    driver.verb.leaveEffectResolution();

    expect(s.perm("ds").isSuspended).toBe(false);
    expect(s.perm("nonDs").isSuspended).toBe(true);
  });

  it("returns real opposing Digimon within the 14-cost budget and leaves an over-budget target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-026", as: "base" }],
          hand: [{ card: "EX8-029", as: "aegisdramon" }],
          deck: ["AD1-001", "AD1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "sevenA" },
            { card: "BT1-024", as: "sevenB" },
            { card: "EX8-029", as: "overBudget" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("aegisdramon").instanceId,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("sevenA").instanceId));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("overBudget").instanceId,
    ]);
    expect(s.state.players[1]!.deck.slice(-2).map((card) => card.cardId)).toEqual(["BT1-024", "BT1-024"]);
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

    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "onPlay")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ds"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("nonDs"), "beAffected", "Digimon")).toBe(false);

    s.state.memory = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "onPlay")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ds"), "beAffected", "Digimon")).toBe(false);

    s.state.memory = -2;
    await advance(s.engine).recompute();
    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "onPlay")).toBe(false);
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
        // Plesiomon's own WhenPlayed effect DNA digivolves into a DS Digimon and then
        // attacks; give the defender security so that incidental attack does not end
        // the game before EX8-029's own WhenDigivolving effect gets to resolve.
        1: { security: 1 },
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
