import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_055 } from "./BT25-055.js";
import "../index.js";

describe("BT25-055 Deramon", () => {
  it("matches the catalog, TS alternate evolution, and all three effect clauses", () => {
    expect(getCardDefinition("BT25-055")).toMatchObject({
      cardId: "BT25-055",
      set: "BT25",
      nameEn: "Deramon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 6000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Avian", "Iliad", "TS", "Vegetation"],
      rarity: "C",
      maxCountInDeck: 4,
      dualEffect: "Deramon",
    });
    expect(digivolutionRequirementsFor("BT25-055")).toContainEqual({
      level: 4,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    });

    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(BT25_055.effects?.find((entry) => entry.trigger === trigger)?.actions?.[1]).toMatchObject({
        kind: "Unsuspend",
        condition: { kind: "totalDigimonCount", filter: { suspended: true, kind: ["Digimon"] }, op: "gte", value: 2 },
      });
    }
    const allTurns = BT25_055.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
    });
    expect((allTurns?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      target: { filter: { controller: "mine", kind: ["Digimon"], dp: { op: "lte", value: 4000 } } },
    });
    const inherited = BT25_055.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "RedirectAttack",
      target: { filter: { controller: "mine", suspended: true, kind: ["Digimon"] } },
    });
  });

  it("plays an eligible Digimon only when Deramon itself suspends, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-055", as: "deramon" },
            { card: "BT1-009", as: "other" },
          ],
          hand: [
            { card: "BT25-047", as: "first" },
            { card: "BT25-047", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("other").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(2);

    await advance(s.engine).verb.suspend([s.perm("deramon").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-047")).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("deramon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("deramon").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("supports the public TS alternate evolution from a level 4 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-050", as: "source" }], hand: [{ card: "BT25-055", as: "evolver" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolver").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-055");
    expect(s.state.memory).toBe(0);
  });
});
