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
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-055");
    expect(s.state.memory).toBe(0);
  });

  it("supports the ordinary green level-4 evolution at cost 3 and rejects a wrong level", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-069", as: "source" }], hand: [{ card: "BT25-055", as: "evolver" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-055");
    expect(s.state.memory).toBe(2);
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT1-069"]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "wrongLevel" }], hand: [{ card: "BT25-055", as: "evolver" }] },
    });
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("wrongLevel").permanentId,
        instanceId: invalid.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.perm("wrongLevel").topCard.cardId).toBe("BT1-009");
  });

  it("resolves the public When Digivolving threshold and unsuspends an own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-050", as: "source", suspended: true },
            { card: "BT1-009", as: "other", suspended: true },
          ],
          hand: [{ card: "BT25-055", as: "evolver" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-055" && !s.perm("source").isSuspended);
    expect(s.perm("source").isSuspended).toBe(false);
  });

  it("redirects an opponent's public player attack to the suspended inherited host", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-042", as: "host", under: ["BT25-055"], suspended: true }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").permanentId);
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("host").permanentId),
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT25-042");
  });

  it("plays a 4000-DP boundary match but leaves wrong-trait and over-4000 cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-055", as: "deramon" }],
          hand: [
            { card: "BT25-051", as: "boundary" },
            { card: "BT25-046", as: "wrongTrait" },
            { card: "BT25-053", as: "tooLarge" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("deramon").permanentId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("boundary").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("wrongTrait").instanceId, s.inst("tooLarge").instanceId]),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("boundary").instanceId),
    ).toBe(true);
  });
});
