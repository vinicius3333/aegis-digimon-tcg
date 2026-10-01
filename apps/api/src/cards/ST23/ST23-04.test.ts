import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../P/P-236.js";
import "./ST23-04.js";

describe("ST23-04 Murasamemon", () => {
  it("reduces an opponent Digimon by 5000 when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-03", as: "base" }],
          hand: [{ card: "ST23-04", as: "murasamemon" }],
          deck: ["BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 10000 }], deck: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("murasamemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST23-04" && s.perm("opponent").currentDP === 5000);
    expect(s.perm("base").topCard?.cardId).toBe("ST23-04");
    expect(s.perm("opponent").currentDP).toBe(5000);
  });

  it("uses a Glowing Dawn Option with its cost reduced by 3 after paying the under-Tamer cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", as: "cost", faceUp: false }] }],
          hand: [
            { card: "ST23-04", as: "murasamemon" },
            { card: "P-236", as: "option" },
          ],
          deck: ["ST23-02", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    const costId = s.inst("cost").instanceId;
    const optionId = s.inst("option").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("murasamemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === costId) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId),
    );

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
  });

  it("retains both play/use branches and the printed inherited unsuspend cost", () => {
    const card = runtimeCompiledCard("ST23-04");
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const modal = card?.effects.find((effect) => effect.trigger === trigger)?.actions[1];
      expect(modal).toMatchObject({
        kind: "Modal",
        cost: { kind: "trashBottomFaceDownUnderTamer" },
        options: [
          [{ kind: "PlayWithoutCost", payCost: true, reduceCostBy: 3 }],
          [{ kind: "UseOptionWithoutCost", payCost: true, reduceCostBy: 3 }],
        ],
      });
    }
    expect(card?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
  });

  it("resolves Alliance in a real attack and suspends the chosen ally", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST23-04", as: "attacker" },
          { card: "ST23-03", as: "ally" },
        ],
      },
      1: { security: ["ST1-09", "ST1-09"] },
    });
    const attacker = s.perm("attacker");
    const ally = s.perm("ally");
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(attacker, "Alliance")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const combat = (
      s.engine as unknown as {
        combat: { hasOpenAllianceDecision: boolean; allianceDecisionPermanentId?: string; isAttacking: boolean };
      }
    ).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(combat.allianceDecisionPermanentId).toBe(attacker.permanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: ally.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !combat.isAttacking && ally.isSuspended && s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true);
    expect(ally.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

async function playMurasamemonIntoZeroDp(branch: { hand: string; optionIndex: number }) {
  let glowingDawnId = "";
  let opponentId = "";
  let opponentWhenBranchLanded: { onField: boolean; dp?: number } | undefined;
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] }],
        hand: [
          { card: "ST23-04", as: "murasamemon" },
          { card: branch.hand, as: "glowingDawn" },
        ],
        deck: ["ST23-02", "BT1-002", "BT1-003"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 5000 }] },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferOptionIndex: branch.optionIndex,
      onEvent: (event) => {
        if (event.kind !== "cardsMoved" || event.to !== "battleArea") return;
        if (!event.instanceIds.includes(glowingDawnId)) return;
        const opponent = s.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === opponentId);
        opponentWhenBranchLanded = { onField: opponent !== undefined, dp: opponent?.currentDP };
      },
    },
  );
  opponentId = s.perm("opponent").permanentId;
  glowingDawnId = s.inst("glowingDawn").instanceId;
  s.state.memory = 10;
  await s.ready();

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("murasamemon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId));

  const branchIndex = s.events.findIndex(
    (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(glowingDawnId),
  );
  const deletionIndex = s.events.findIndex(
    (event) =>
      event.kind === "cardsMoved" &&
      (event.deletedPermanents ?? []).some((deleted) => deleted.permanentId === opponentId),
  );
  return { s, opponentWhenBranchLanded, branchIndex, deletionIndex };
}

describe("ST23-04 Murasamemon — KB Q&A rulings", () => {
  it("keeps a 0 DP Digimon on the field until the played Glowing Dawn card has resolved (Q6166)", async () => {
    const { s, opponentWhenBranchLanded, branchIndex, deletionIndex } = await playMurasamemonIntoZeroDp({
      hand: "ST23-02",
      optionIndex: 0,
    });
    expect(opponentWhenBranchLanded).toEqual({ onField: true, dp: 0 });
    expect(branchIndex).toBeGreaterThanOrEqual(0);
    expect(deletionIndex).toBeGreaterThan(branchIndex);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST23-02")).toBe(true);
  });

  it("keeps a 0 DP Digimon on the field until the used Glowing Dawn Option finishes its [Main] effect (Q6166)", async () => {
    const { s, opponentWhenBranchLanded, branchIndex, deletionIndex } = await playMurasamemonIntoZeroDp({
      hand: "P-236",
      optionIndex: 1,
    });
    expect(opponentWhenBranchLanded).toEqual({ onField: true, dp: 0 });
    expect(branchIndex).toBeGreaterThanOrEqual(0);
    expect(deletionIndex).toBeGreaterThan(branchIndex);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "P-236")).toBe(true);
  });
});
