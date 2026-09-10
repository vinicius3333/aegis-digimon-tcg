import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-012.js";
import "../index.js";

function inertDeck(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `BT1-${String(9 + (index % 6)).padStart(3, "0")}`);
}

function digivolveIntoMegidramon(
  source: string | { card: string; as: string },
  deck = inertDeck(1),
  opponentBattleArea: Array<string | { card: string; as: string; dp?: number }> = [],
  opponentDeck: string[] = [],
) {
  return setupEngine(
    {
      0: {
        battleArea: [typeof source === "string" ? { card: source, as: "source" } : source],
        hand: [{ card: "EX2-012", as: "megidramon" }],
        deck,
      },
      1: { battleArea: opponentBattleArea, deck: opponentDeck },
    },
    { autoSelectCards: true, autoOrderTriggers: true },
  );
}

describe("EX2-012 Megidramon", () => {
  it("matches the catalog and compiles every printed clause", () => {
    expect(getCardDefinition("EX2-012")).toMatchObject({
      cardId: "EX2-012",
      nameEn: "Megidramon",
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 5 },
        { color: "Purple", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Evil Dragon", "Four Great Dragons"],
      effectText:
        "The name of this card/Digimon is also treated as [ChaosGallantmon].[When Digivolving] Delete 1 of your opponent's Digimon with 10000 DP or less. If no Digimon was deleted by this effect, trash the top 5 cards of both players' decks.[On Deletion] You may play 1 [Guilmon] and 1 [Takato Matsuki] from your hand and/or trash without paying their memory costs.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["ChaosGallantmon"] }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 10000 } } },
        },
        { kind: "TrashTopDeck", controller: "both", amount: 5, condition: { kind: "ifThisEffectDidNotDelete" } },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
      ],
    });
  });

  it("is always also treated as ChaosGallantmon (Q3303)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-012", as: "megidramon" }] } });
    await s.ready();
    expect(observe(s.engine).effectiveNames(s.perm("megidramon"))).toEqual(
      expect.arrayContaining(["megidramon", "chaosgallantmon"]),
    );
  });

  it("takes a mandatory legal target and does not mill when deletion succeeds (Q3299)", async () => {
    const s = digivolveIntoMegidramon("ST7-08", inertDeck(1), [
      { card: "BT6-063", dp: 8000, as: "low" },
      { card: "BT6-063", dp: 11000, as: "high" },
    ]);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("megidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("high").permanentId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("mills the top five of both decks when no legal target exists (Q3298)", async () => {
    const s = digivolveIntoMegidramon(
      "ST7-08",
      inertDeck(6),
      [{ card: "BT6-063", dp: 11000, as: "high" }],
      inertDeck(5),
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("megidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 0);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(5);
    expect(s.perm("high")).toBeDefined();
  });

  it("mills after choosing a deletion-immune target (Q3300)", async () => {
    const s = digivolveIntoMegidramon(
      "ST7-08",
      inertDeck(6),
      [{ card: "BT14-062", dp: 6000, as: "immune" }],
      inertDeck(5),
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("megidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 0);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("immune").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(5);
  });

  it("lets Decoy prevent the chosen deletion, then still mills both decks (Q3302)", async () => {
    const s = digivolveIntoMegidramon(
      "ST7-08",
      inertDeck(6),
      [
        { card: "BT6-058", dp: 2000, as: "target" },
        { card: "BT6-059", as: "decoy" },
      ],
      inertDeck(5),
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("megidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 0);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("decoy").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(6);
  });

  it("recognizes Megidramon as Gallantmon-family in Guilmon's public reveal (Q3301)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-008", as: "guilmon" }],
          deck: [{ card: "EX2-012", as: "revealed" }, ...inertDeck(3)],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("revealed").instanceId);
  });

  it("plays exact Guilmon from hand and Takato from trash on public deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-012", as: "megidramon", suspended: true }],
          hand: [{ card: "EX2-008", as: "guilmon" }],
          trash: [{ card: "EX2-056", as: "takato" }],
          deck: inertDeck(6),
        },
        1: { battleArea: [{ card: "BT6-065", dp: 15000, as: "attacker" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("megidramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX2-008") &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX2-056"),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("takato").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX2-012")).toBe(false);
  });

  it("rejects evolution from a non-level-5 source", async () => {
    const s = digivolveIntoMegidramon("EX2-009");
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("megidramon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
});
