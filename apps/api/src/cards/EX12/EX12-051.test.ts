import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX12-051.js";

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
  });

  it("suspends an opponent Digimon and de-digivolves it on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-051", as: "source" }] },
        1: { battleArea: [{ card: "BT1-020", as: "target", under: ["BT1-009"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("trashes the opponent's top security when its NSp carrier wins a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-050", as: "winner", under: ["EX12-051"] }] },
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
});
