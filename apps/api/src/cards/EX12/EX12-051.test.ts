import { describe, expect, it } from "vitest";
import { compiledEffects, EffectTiming, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX12-051.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";

describe("EX12-051 Lamortmon", () => {
  it("maps alternate evolution, keywords, entry effects, and the inherited battle-win watcher", () => {
    expect(digivolutionRequirementsFor("EX12-051")).toEqual([
      { level: 4, texts: ["Angoramon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["NSp"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toEqual([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 } },
          {
            kind: "DeDigivolve",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: 1,
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBattleWon",
          sourceFilter: {
            isSelfRef: true,
            nameOrTrait: [
              { tokens: ["Angoramon"], match: "text" },
              { tokens: ["NSp"], match: "trait" },
            ],
          },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(registeredCompiledCards.get("EX12-051")).toEqual(compiled);
    expect(compiledEffects["EX12-051"]).toEqual(compiled);
  });

  it("separately suspends a Digimon or Tamer and de-digivolves a Digimon on both timings", async () => {
    for (const timing of [EffectTiming.OnPlay, EffectTiming.WhenDigivolving]) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX12-051", as: "source" }] },
          1: {
            battleArea: [
              { card: "BT1-089", as: "tamer" },
              { card: "BT1-020", as: "digimon", under: ["BT1-009"] },
            ],
          },
        },
        { autoSelectCards: true },
      );

      await advance(s.engine).fire(timing, s.perm("source"));
      await settle();

      expect(s.perm("tamer").isSuspended).toBe(true);
      expect(s.perm("digimon").stack).toHaveLength(0);
    }
  });

  it("Q6829/Q6830 trashes security when a non-NSp Angoramon-text carrier wins a Digimon battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-051", as: "winner", under: ["EX12-051"] }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "loser", suspended: true }],
          security: [
            { card: "BT1-010", as: "topSecurity" },
            { card: "BT1-011", as: "bottomSecurity" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: s.perm("loser").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("Q6831 also triggers after winning a battle against a Security Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-051", as: "winner", under: ["EX12-051"] }] },
        1: {
          security: [
            { card: "BT1-009", as: "securityDigimon" },
            { card: "BT1-010", as: "trashedByEffect" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("securityDigimon").instanceId, s.inst("trashedByEffect").instanceId]),
    );
  });

  it("Q6834 triggers even when Barrier prevents the losing Digimon's battle deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-051", as: "winner", dp: 9000, under: ["EX12-051"] }] },
        1: {
          battleArea: [{ card: "BT13-041", as: "barrier", suspended: true }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const barrierId = s.perm("barrier").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: barrierId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat;
    await settle(() => combat.hasOpenBarrierDecision);
    expect(s.engine.applyIntent(1, { type: "respondBarrier", permanentId: barrierId, accept: true } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === barrierId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("uses the inherited battle-win effect only once per turn and only for its own host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-051", as: "host", under: ["EX12-051"] },
          { card: "BT1-069", as: "other" },
        ],
      },
      1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("other").permanentId });
    expect(s.state.players[1]!.security).toHaveLength(3);
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("host").permanentId });
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("digivolves through both colors and both alternates, rejecting a nonmatch", async () => {
    for (const [baseCardId, useAlternateCost, expectedCost] of [
      ["BT1-069", false, 4],
      ["BT10-061", false, 4],
      ["BT10-051", true, 3],
      ["EX7-018", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX12-051", as: "target" }] },
      });
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-051");
      expect(s.state.memory).toBe(4 - expectedCost);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "base" }], hand: [{ card: "EX12-051", as: "target" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("maps the complete catalog identity and publishes Reboot plus Blocker", async () => {
    expect(getCardDefinition("EX12-051")).toMatchObject({
      nameEn: "Lamortmon",
      colors: ["Green", "Black"],
      playCost: 7,
      dp: 7000,
      level: 5,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Beast", "NSp"],
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-051", as: "source" }] } });
    await s.ready();
    expect([...s.perm("source").keywords]).toEqual(expect.arrayContaining(["Reboot", "Blocker"]));
  });
});
