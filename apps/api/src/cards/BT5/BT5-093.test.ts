import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT12/BT12-059.js";
import "../EX1/EX1-004.js";
import "./BT5-093.js";

describe("BT5-093 Tai Kamiya & Matt Ishida", () => {
  it("gains 2 memory at turn start when the opponent has a level 6 or higher Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-093", as: "tamer" }] },
      1: { battleArea: [{ card: "BT5-084", as: "level6" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));

    expect(s.state.memory).toBe(2);
  });

  it("does not gain memory for an opposing Digimon below level 6", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-093", as: "tamer" }] },
      1: { battleArea: [{ card: "BT5-071", as: "lowLevel" }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));
    expect(s.state.memory).toBe(0);
  });

  it("requires the level 6+ Digimon to belong to the opponent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-093", as: "tamer" },
          { card: "BT5-084", as: "ownLevel6" },
        ],
      },
      1: { battleArea: [] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));
    expect(s.state.memory).toBe(0);
  });

  it("gives all own Omnimon Security Attack +1 on your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-093", as: "tamer" },
          { card: "BT5-086", as: "omni-a" },
          { card: "BT5-111", as: "omni-b" },
        ],
      },
      1: { battleArea: [{ card: "BT5-086", as: "opponentOmni" }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("omni-a"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("omni-b"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("opponentOmni"), "SecurityAttack")).toBe(0);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).keywordAmount(s.perm("omni-a"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("omni-b"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("opponentOmni"), "SecurityAttack")).toBe(0);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-093", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));

    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(true);
  });
});

async function handAfterAgumonReveal(revealedTamer: string): Promise<string[]> {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT12-059", as: "agumon" }],
        deck: ["BT1-015", revealedTamer, "BT1-009", "BT1-010"],
      },
    },
    { autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.memory = 5;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.hand.length > 0);
  await settle();
  return s.state.players[0]!.hand.map(({ cardId }) => cardId).sort();
}

describe("BT5-093 Tai Kamiya & Matt Ishida — KB Q&A rulings", () => {
  it("can be added to hand by BT12-059's reveal as a Tamer with [Tai Kamiya] in its name (Q2189)", async () => {
    for (const taiTamer of ["BT5-093", "BT9-084", "P-012"]) {
      expect(await handAfterAgumonReveal(taiTamer)).toEqual(["BT1-015", taiTamer].sort());
    }
    expect(await handAfterAgumonReveal("BT1-087")).toEqual(["BT1-015"]);
  });

  it("cannot be played by EX1-004's inherited effect, which only plays cards named exactly [Tai Kamiya] (Q3191)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-020", under: ["BT1-009", "EX1-004"], as: "attacker" }],
          hand: [
            { card: "BT5-093", as: "taiAndMatt" },
            { card: "AD1-022", as: "izzyAndTai" },
            { card: "ST1-12", as: "tai" },
          ],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("taiAndMatt").instanceId, s.inst("izzyAndTai").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tai").instanceId),
    );

    const handIds = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handIds).toContain(s.inst("taiAndMatt").instanceId);
    expect(handIds).toContain(s.inst("izzyAndTai").instanceId);
    expect(handIds).not.toContain(s.inst("tai").instanceId);
  });
});
