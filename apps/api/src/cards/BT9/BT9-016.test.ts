import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-016.js";

describe("BT9-016 WarGreymon (X Antibody)", () => {
  it("matches the complete catalog, security watcher, end-attack deletion, and evolution IR", () => {
    expect(getCardDefinition("BT9-016")).toMatchObject({
      cardId: "BT9-016",
      nameEn: "WarGreymon (X Antibody)",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Dragonkin", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenSecurityRemoved",
              sourceFilter: { controller: "opponent" },
              actions: [{ kind: "GainMemory", amount: 1 }],
            },
          ],
        },
        {
          trigger: "EndOfAttack",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", dp: { op: "lte", relativeToSource: true } }, count: 1 },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["WarGreymon"], cost: 1, isAlternate: true }],
    });
  });

  it("uses the 1-cost WarGreymon alternate route after a complete legal evolution chain", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "stack" },
        hand: [
          { card: "BT9-008", as: "rookie" },
          { card: "AD1-001", as: "champion" },
          { card: "BT1-021", as: "ultimate" },
          { card: "BT1-025", as: "warGreymon" },
          { card: "BT9-016", as: "warGreymonX" },
        ],
      },
    });
    s.state.memory = 10;
    for (const alias of ["rookie", "champion", "ultimate", "warGreymon"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("stack").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("stack").topCard.instanceId === s.inst(alias).instanceId);
    }
    const memoryBeforeAlternate = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stack").permanentId,
        instanceId: s.inst("warGreymonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard.cardId === "BT9-016");
    expect(s.state.memory).toBe(memoryBeforeAlternate - 1);
  });

  it("gains 1 memory whenever a card is removed from the opponent's security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-016", as: "war" }] } });
    s.state.memory = 0;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(1);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.memory).toBe(1);
  });

  it("gains memory through a public security check before the attack finishes (Q1811)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-016", as: "war", under: ["BT9-109"] }] },
      1: { security: ["BT1-002"] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("war").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(1);
  });

  it("once per turn deletes an opponent no larger than itself at end of attack with a required source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-016", as: "war", under: ["BT9-109"] }] },
        1: { battleArea: [{ card: "BT9-056", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("war"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("recognizes the exact WarGreymon card name in its stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-016", as: "war", under: ["BT1-025"] }] },
        1: { battleArea: [{ card: "BT8-084", as: "target", dp: 11000 }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("war"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("implements Q1810 by rejecting an X Antibody trait without the exact card name", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-016", as: "war", under: ["BT9-015"] }] },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("war").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("deletes at exactly its live DP and enforces once per turn through public attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-016", as: "war", under: ["BT9-109"] }] },
        1: {
          security: ["BT1-001", "BT1-002"],
          battleArea: [
            { card: "BT1-028", as: "fifteenThousand", dp: 15000 },
            { card: "BT1-028", as: "twelveThousandA", dp: 12000 },
            { card: "BT1-028", as: "twelveThousandB", dp: 12000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    for (let attack = 0; attack < 2; attack += 1) {
      s.state.turnSeat = 0;
      s.state.phase = Phase.Main;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("war").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      if (attack === 0) {
        await advance(s.engine).verb.unsuspend([s.perm("war").permanentId]);
      }
    }
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.permanentId === s.perm("fifteenThousand").permanentId,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.currentDP === 12000)).toHaveLength(1);
  });
});
