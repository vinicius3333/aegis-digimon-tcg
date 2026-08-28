import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/index.js";
import { compiled } from "./BT18-097.js";

describe("BT18-097 Dark to Light, Thunder to Gunfire", () => {
  it("covers the five-card Hybrid placement and MagnaGarurumon alternative", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: { count: 5, upTo: true, from: ["hand", "trash"], distinctNames: true },
          underFilter: { kind: ["Tamer"] },
        },
        {
          kind: "Digivolve",
          target: { filter: { kind: ["Tamer"], digivolutionCardsAtLeast: 5 } },
          payCost: false,
          from: ["hand", "trash"],
          ignoreRequirements: true,
          into: { nameOrTrait: [{ tokens: ["MagnaGarurumon"], match: "name" }] },
        },
      ],
    });
  });

  it("naturally executes Main by placing distinct Hybrid names and freely evolving a five-card Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-088", as: "tamer" }],
          hand: [
            { card: "BT18-097", as: "option" },
            { card: "BT18-063", as: "beetle" },
            { card: "BT18-064", as: "mercury" },
            { card: "BT18-066", as: "sephiroth" },
            { card: "BT18-067", as: "metal" },
            { card: "BT18-068", as: "wise" },
            { card: "BT18-042", as: "magna" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT18-042");

    expect(s.perm("tamer").topCard?.cardId).toBe("BT18-042");
    expect(s.perm("tamer").stack.filter((card) => card.cardId.startsWith("BT18-0")).length).toBeGreaterThanOrEqual(5);
    expect(s.state.memory).toBe(10);
  });

  it("does not treat duplicate Hybrid names as distinct or evolve a Tamer with fewer than five cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-088", as: "tamer", under: ["BT18-063", "BT18-064", "BT18-066", "BT18-067"] }],
          hand: [
            { card: "BT18-097", as: "option" },
            { card: "BT18-063", as: "duplicateA" },
            { card: "BT18-063", as: "duplicateB" },
            { card: "BT18-042", as: "magna" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.perm("tamer").topCard?.cardId).toBe("BT18-088");
    expect(s.perm("tamer").stack.filter((card) => card.cardId === "BT18-063")).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("magna").instanceId)).toBe(true);
  });

  it("executes Security by playing an inherited-effect Tamer and returning this Option to hand", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT18-097", as: "option", faceUp: true }], hand: [{ card: "BT18-088", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
