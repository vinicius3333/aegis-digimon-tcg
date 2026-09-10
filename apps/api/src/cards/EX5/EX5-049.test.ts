import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX5-049.js";
import "../BT1/BT1-013.js";
import "../BT1/BT1-015.js";
import "./EX5-055.js";
import "../index.js";

describe("EX5-049 GrapLeomon", () => {
  it("matches the catalog and encodes Fortitude plus the 4000-DP return clauses", () => {
    expect(getCardDefinition("EX5-049")).toMatchObject({
      cardId: "EX5-049",
      nameEn: "GrapLeomon",
      colors: ["Black", "Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Beastkin"],
      effectText: expect.stringContaining("4000 DP or less"),
      inheritedEffectText: expect.stringContaining("gains ＜Piercing＞"),
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Fortitude" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 4, names: ["Leomon"], cost: 3, isAlternate: true }],
    });
  });
  it("inherits Piercing while it has Leomon in its name", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
          while: { kind: "selfHasNameContaining", names: ["Leomon"] },
        },
      ],
    });
  });

  it("returns one opposing Digimon at the 4000 DP boundary to the bottom of its deck on public play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-049", as: "grap" }] },
        1: {
          battleArea: [
            { card: "BT1-015", as: "boundary", dp: 4000 },
            { card: "BT1-019", as: "above", dp: 6000 },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grap").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT1-015"));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT1-015")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT1-019")).toBe(true);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toContain("BT1-015");
    expect(observe(s.engine).hasKeyword(s.perm("grap"), "Fortitude")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the Leomon alternate evolution route for exactly 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-047", as: "base" }], hand: [{ card: "EX5-049", as: "grap" }] },
      1: { battleArea: [{ card: "BT1-015", as: "boundary", dp: 4000 }], deck: ["BT1-009"] },
    });
    s.state.memory = 3;
    await s.ready();
    const boundaryId = s.perm("boundary").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grap").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX5-049");
    expect(s.perm("base").topCard.cardId).toBe("EX5-049");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === boundaryId)).toBe(false);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toContain("BT1-015");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects the Leomon alternate evolution route from a non-Leomon base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "EX5-049", as: "grap" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grap").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
  });

  it("replays itself through Fortitude after public battle deletion when it has digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-049", as: "source", under: ["EX5-047"], dp: 3000, suspended: true }] },
        1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 5000 }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const sourceCardId = s.inst("source").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === sourceCardId));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === sourceCardId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.find((perm) => perm.topCard?.instanceId === sourceCardId)!.stack,
    ).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants inherited Piercing only when the host's current top card has Leomon in its name", async () => {
    const matching = setupEngine({
      0: {
        battleArea: [{ card: "EX5-047", as: "host" }],
        hand: [
          { card: "EX5-049", as: "grap" },
          { card: "EX5-055", as: "heavy" },
        ],
      },
    });
    matching.state.memory = 10;
    await matching.ready();
    expect(
      matching.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: matching.perm("host").permanentId,
        instanceId: matching.inst("grap").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => matching.perm("host").topCard?.cardId === "EX5-049");
    expect(matching.state.memory).toBe(7);
    expect(
      matching.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: matching.perm("host").permanentId,
        instanceId: matching.inst("heavy").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => matching.perm("host").topCard?.cardId === "EX5-055");
    expect(observe(matching.engine).hasPierce(matching.perm("host"))).toBe(true);
    // The normal black Lv.5 route on HeavyLeomon costs 5 (the alternate
    // Leomon-name route costs 4), so 7 -> 2 after GrapLeomon's 3-cost route.
    expect(matching.state.memory).toBe(2);
    expect(matching.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-047", "EX5-049"]);
    expect(matching.state.pendingDecision).toBeUndefined();

    const nonMatching = setupEngine({ 0: { battleArea: [{ card: "EX5-050", as: "host", under: ["EX5-049"] }] } });
    await nonMatching.ready();
    expect(observe(nonMatching.engine).hasPierce(nonMatching.perm("host"))).toBe(false);
  });
});
