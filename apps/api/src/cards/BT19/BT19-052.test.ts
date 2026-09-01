import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-052 Vespamon", () => {
  it("publicly uses the Royal Base level-4 cost-3 route", async () => {
    expect(digivolutionRequirementsFor("BT19-052")).toContainEqual({
      level: 4,
      traits: ["Royal Base"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-046", as: "base" }],
          hand: [{ card: "BT19-052", as: "vespa" }],
          deck: ["BT19-030"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vespa").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-052");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT18-046"]);
    expect(s.state.memory).toBe(2);
  });

  it("face-up security grants Blocker to all and only Royal Base Digimon on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT19-052", faceUp: true }],
        battleArea: [
          { card: "BT19-045", as: "royal" },
          { card: "BT19-046", as: "plain" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("royal"), "Blocker")).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("royal"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Blocker")).toBe(false);
  });

  it.each([
    [0, "BT1-009", "BT1-015"],
    [1, "BT1-015", "BT1-019"],
    [2, "BT1-019", "BT1-022"],
  ] as const)("with %s face-up security deletes at ceiling but not the next cost", async (count, target, over) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-052", as: "vespa" }],
          security: Array.from({ length: count }, () => ({ card: "BT19-045", faceUp: true })),
        },
        1: {
          battleArea: [
            { card: target, as: "target" },
            { card: over, as: "over" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("vespa"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === target)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === over)).toBe(true);
  });

  it("When Digivolving uses the same scaled deletion ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-052", as: "vespa" }], security: [{ card: "BT19-045", faceUp: true }] },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("vespa"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("has the Insectoid rule trait and inherited battle deletion trashes security once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-052", as: "vespa" },
          { card: "BT19-053", as: "host", under: ["BT19-052"] },
        ],
      },
      1: { security: ["BT19-030", "BT19-031"] },
    });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("vespa"), "Insectoid")).toBe(true);
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.players[1]!.security).toHaveLength(1);
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("resolves On Play deletion from a public play intent", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT19-052", as: "vespa" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vespa").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
