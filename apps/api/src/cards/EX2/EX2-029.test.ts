import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-029.js";
import "./EX2-029.js";

describe("EX2-029 MegaGargomon", () => {
  it("matches the catalog and compiled suspension and return clauses", () => {
    expect(getCardDefinition("EX2-029")).toMatchObject({
      cardId: "EX2-029",
      nameEn: "MegaGargomon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 13000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Machine"],
      effectText:
        "[When Digivolving] For each green Tamer you have in play, suspend 1 of your opponent's Digimon. They don't unsuspend during your opponent's next unsuspend phase.[When Attacking][Once Per Turn] Return 1 of your opponent's suspended Digimon with DP less than or equal to this Digimon's DP to its owner's hand.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "Suspend",
              scaling: {
                per: 1,
                unit: "cards",
                filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"], colors: ["Green"] },
              },
              bindResultAs: "suspendedByMegaGargomon",
            },
            {
              kind: "Restrict",
              restriction: "unsuspend",
              duration: "untilOpponentTurnEnd",
              target: { filter: { boundRef: "suspendedByMegaGargomon" }, count: "all" },
            },
          ],
        },
        {
          trigger: "WhenAttacking",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "Return",
              to: "hand",
              target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("suspends and prevents unsuspension of one opposing Digimon per green Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-027", as: "base" }, "EX2-061", "EX2-061"],
          hand: [{ card: "EX2-029", as: "evolution" }],
          deck: ["BT1-009"],
          security: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "EX2-014", as: "one" },
            { card: "EX2-019", as: "two" },
            { card: "EX2-020", as: "three" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("one"), "unsuspend") &&
        observe(s.engine).isRestricted(s.perm("two"), "unsuspend"),
    );
    expect(s.perm("one").isSuspended).toBe(true);
    expect(s.perm("two").isSuspended).toBe(true);
    expect(s.perm("three").isSuspended).toBe(false);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-027"]);
    expect(s.perm("base").topCard.cardId).toBe("EX2-029");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(observe(s.engine).isRestricted(s.perm("one"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("two"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("three"), "unsuspend")).toBe(false);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("one").isSuspended).toBe(true);
    expect(s.perm("two").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("returns one suspended opposing Digimon whose DP is at most its own", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-029", as: "attacker" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "EX2-014", as: "low", suspended: true },
            { card: "EX2-014", as: "low2", suspended: true },
            { card: "EX2-036", as: "high", dp: 14000, suspended: true },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.perm("high").isSuspended).toBe(true);

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 2);
    expect(s.state.players[1]!.hand).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("high").permanentId,
    );
    expect(s.perm("high").topCard.cardId).toBe("EX2-036");
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
