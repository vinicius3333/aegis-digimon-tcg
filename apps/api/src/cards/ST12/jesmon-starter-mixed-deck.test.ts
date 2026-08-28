import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST12 Jesmon starter — mixed archetype flow", () => {
  it("chains red-egg Option access, Delay evolution, unsuspended battle and both Sistermon engines", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "ST12-01", as: "gurimon" },
          battleArea: [
            { card: "ST12-06", as: "baoHuckmon" },
            { card: "ST12-08", as: "jesmonLine", under: ["ST12-04"] },
            { card: "ST12-04", as: "huckmon" },
          ],
          hand: [
            { card: "ST12-15", as: "option" },
            { card: "ST12-08", as: "saviorHuckmon" },
            { card: "ST12-10", as: "jesmon" },
            { card: "ST12-12", as: "starterBlanc" },
            { card: "BT1-001", as: "drawCost" },
          ],
          trash: [{ card: "BT6-082", as: "classicBlanc" }],
          deck: [
            { card: "ST12-04", as: "revealHit" },
            { card: "BT1-002", as: "revealMissA" },
            { card: "BT1-003", as: "revealMissB" },
            "BT1-004",
            "BT1-005",
            "BT1-006",
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "unsuspendedTarget", dp: 3000 }],
          security: ["BT1-007", "BT1-008", "BT1-009"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 10;

    // The hatched red egg is the only red source needed to use ST12-15.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST12-15"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealHit").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("revealMissA").instanceId, s.inst("revealMissB").instanceId]),
    );

    // Delay becomes legal on a later turn and reduces SaviorHuckmon's 3-cost
    // evolution to 2. Its When Digivolving grant then permits the unsuspended target.
    const delay = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST12-15")!;
    s.state.turnCount += 1;
    await s.engine.recomputeContinuousEffects();
    const delayEntry = (
      JSON.parse(delay.activatableEffectsJson) as Array<{
        instanceId: string;
        effectKey: string;
        description: string;
      }>
    ).find((entry) => /delay/i.test(entry.description));
    expect(delayEntry).toBeDefined();
    const delayCardId = delay.topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: delayEntry!.instanceId,
        effectKey: delayEntry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === delayCardId));
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("baoHuckmon").permanentId,
        instanceId: s.inst("saviorHuckmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("baoHuckmon").topCard.cardId === "ST12-08");
    await settle(() => s.perm("baoHuckmon").attackablePermanentIds.includes(s.perm("unsuspendedTarget").permanentId));
    expect(s.state.memory).toBe(6);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("baoHuckmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspendedTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    // A second established line evolves to Jesmon and inherits ST12-08. Its attack plays one
    // Sistermon from hand while the inherited effect plays the other from trash.
    // Huckmon gains memory only once; Jesmon's own effect buffs only once.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jesmonLine").permanentId,
        instanceId: s.inst("jesmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jesmonLine").topCard.cardId === "ST12-10");
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jesmonLine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const sisters = s.state.players[0]!.battleArea.filter(
        (permanent) => permanent.topCard.cardId === "ST12-12" || permanent.topCard.cardId === "BT6-082",
      );
      return sisters.length === 2 && s.state.players[1]!.security.length === 1;
    });

    const starterBlanc = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST12-12")!;
    const classicBlanc = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT6-082")!;
    await settle(
      () =>
        observe(s.engine).hasKeyword(starterBlanc, "Decoy") &&
        observe(s.engine).hasKeyword(starterBlanc, "Blocker") &&
        observe(s.engine).hasKeyword(classicBlanc, "Blocker"),
    );
    expect(s.state.memory).toBe(3);
    expect(s.perm("jesmonLine").currentDP).toBeGreaterThanOrEqual(15000);
    expect(observe(s.engine).keywordAmount(s.perm("jesmonLine"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(starterBlanc, "Decoy")).toBe(true);
    expect(observe(s.engine).hasKeyword(starterBlanc, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(classicBlanc, "Blocker")).toBe(true);
    expect([...starterBlanc.grantedKeywords]).toEqual(expect.arrayContaining(["Decoy", "Blocker"]));
  });
});
