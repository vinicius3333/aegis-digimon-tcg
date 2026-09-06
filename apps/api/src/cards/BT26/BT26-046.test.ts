import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
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
      0: {
        hand: [{ card: "BT26-046", as: "gryphonmon" }],
        battleArea: [{ card: "BT1-080", as: "protected", dp: 15000, suspended: true }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "suspendTarget" },
          { card: "BT1-080", as: "attacker", dp: 15000 },
        ],
      },
    });
    s.state.memory = 11;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gryphonmon").instanceId })).toEqual({
      ok: true,
    });
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
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.decisionId !== pending.decisionId);
    pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("protected").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("suspendTarget").isSuspended);

    expect(s.perm("suspendTarget").isSuspended).toBe(true);
    expect(s.perm("protected").isSuspended).toBe(true);
    const continuous = (
      s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string) => boolean } }
    ).continuous;
    expect(continuous.hasRestriction(s.perm("suspendTarget").permanentId, "unsuspend")).toBe(true);
    expect(continuous.hasRestriction(s.perm("protected").permanentId, "unsuspend")).toBe(false);
    expect(continuous.hasRestriction(s.perm("protected").permanentId, "beDeletedInBattle")).toBe(true);

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("protected").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("protected").permanentId),
    ).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("gryphonmon"))).toBe(true);
    expect([...s.perm("gryphonmon").keywords]).toContain("Vortex");

    await advance(s.engine).runTurn(1);
    expect(continuous.hasRestriction(s.perm("suspendTarget").permanentId, "unsuspend")).toBe(false);
    expect(continuous.hasRestriction(s.perm("protected").permanentId, "beDeletedInBattle")).toBe(false);
  });

  it("uses Vortex and Piercing in a real battle against an unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["AD1-001"],
          deck: ["AD1-001"],
          battleArea: [{ card: "BT26-046", as: "gryphonmon" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "unsuspendedTarget", suspended: false, dp: 3000 }],
          security: [{ card: "BT1-001", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
  });

  it("publicly evolves from a legal Green level-5 TS Digimon and resolves When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-055", as: "base" }],
          hand: [{ card: "BT26-046", as: "gryphonmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gryphonmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT26-046");

    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT25-055");
    expect(s.perm("target").isSuspended).toBe(true);
    const continuous = (
      s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string) => boolean } }
    ).continuous;
    expect(continuous.hasRestriction(s.perm("target").permanentId, "unsuspend")).toBe(true);
    expect(continuous.hasRestriction(s.perm("base").permanentId, "beDeletedInBattle")).toBe(true);
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
