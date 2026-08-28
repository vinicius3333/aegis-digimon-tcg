import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-018.js";
import "./index.js";
import "../P/P-176.js";

describe("BT20-018 Ouryumon", () => {
  it("de-digivolves and attack-gates breeding-area Chronicle evolution on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "DeDigivolve",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: 2,
          },
          {
            kind: "Digivolve",
            target: { targetBreeding: true },
            from: ["hand", "trash"],
            payCost: false,
            optional: true,
            condition: { kind: "duringAttack" },
            into: {
              levelComparison: { op: "lte", value: 6 },
              nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
            },
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          actions: [{ kind: "Delete", target: { filter: { superlative: "lowestDP" } } }],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Trash", target: { fromTop: true }, condition: { kind: "selfHasName", names: ["Alphamon: Ouryuken"] } },
      ],
    });
  });

  it("during an attack immediately evolves the breeding Digimon for free", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT20-012", as: "breedingGinryumon", under: ["BT20-010"] },
          battleArea: [{ card: "BT20-015", as: "attacker", under: ["P-176"] }],
          hand: [{ card: "BT20-018", as: "ouryumon" }],
          trash: [{ card: "BT20-015", as: "breedingEvolution" }],
        },
        1: { security: ["BT20-001", "BT20-001", "BT20-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT20-012");
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT20-010"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("attacker").topCard.cardId === "BT20-018" && s.state.players[0]!.breeding?.topCard.cardId === "BT20-015",
    );

    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-012", "BT20-010"]),
    );
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
  });

  it("de-digivolves one opposing Digimon by exactly 2 on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-018", as: "ouryumon" }] },
      1: { battleArea: [{ card: "BT20-017", as: "opponentStack", under: ["BT20-014", "BT20-013"] }] },
    });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ouryumon"));
    expect(s.perm("opponentStack").stack).toHaveLength(0);
  });

  it("once per turn deletes one opposing Digimon with the lowest DP when either security stack loses a card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-018", as: "ouryumon" }] },
      1: {
        battleArea: [
          { card: "BT20-014", dp: 4000, as: "lowest" },
          { card: "BT20-014", dp: 7000, as: "higher" },
        ],
      },
    });
    await s.ready();
    const lowestId = s.perm("lowest").permanentId;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === lowestId));
    expect(s.perm("higher")).toBeDefined();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => false, 50);
    expect(s.perm("higher")).toBeDefined();
  });

  it("as an Alphamon: Ouryuken source trashes top security when the host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-060", as: "ouryuken", under: ["BT20-018"] }] },
        1: { security: ["BT20-001", "BT20-001", "BT20-001"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ouryuken"));
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
