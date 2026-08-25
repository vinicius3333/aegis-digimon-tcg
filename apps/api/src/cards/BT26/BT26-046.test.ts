import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-046.js";
import "../index.js";

describe("BT26-046 Gryphonmon", () => {
  it("encodes printed Piercing/Vortex, suspended-Digimon cost reduction, and Q7039 independent targets", () => {
    expect(digivolutionRequirementsFor("BT26-046")).toContainEqual({
      level: 5,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]?.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Piercing" }),
        expect.objectContaining({ keyword: "Vortex" }),
      ]),
    );
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 4 }],
    });
    expect(compiled.effects?.[2]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "Suspend" }),
        expect.objectContaining({ kind: "Restrict", restriction: "unsuspend" }),
        expect.objectContaining({ kind: "Restrict", restriction: "beDeletedInBattle" }),
      ]),
    );
    expect(compiled.effects?.[0]?.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: ["Avian"] })]),
    );
  });

  it("publicly suspends and locks an opponent target while protecting one of your Digimon in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-046", as: "gryphonmon", suspended: true }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "suspendTarget" },
          { card: "BT1-080", as: "attacker", dp: 15000 },
        ],
      },
    });
    await s.ready();

    const resolving = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gryphonmon"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    let pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.decisionId !== pending.decisionId);
    pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("attacker").permanentId] },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.perm("suspendTarget").isSuspended).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(false);
    const continuous = (
      s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string) => boolean } }
    ).continuous;
    expect(continuous.hasRestriction(s.perm("attacker").permanentId, "unsuspend")).toBe(true);
    expect(continuous.hasRestriction(s.perm("gryphonmon").permanentId, "beDeletedInBattle")).toBe(true);

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("gryphonmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("gryphonmon").permanentId),
    ).toBe(true);
  });

  it("reduces its play cost by 4 with two suspended Digimon", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-046", as: "gryphonmon" }],
        battleArea: [{ card: "BT1-080", suspended: true }],
      },
      1: { battleArea: [{ card: "BT1-009", suspended: true }] },
    });
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gryphonmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-046"));
    expect(s.state.memory).toBe(0);
  });

  it("does not reduce its play cost with only one suspended Digimon", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-046", as: "gryphonmon" }],
        battleArea: [{ card: "BT1-080", suspended: true }],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gryphonmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-046"));

    expect(s.state.memory).toBe(-4);
  });
});
