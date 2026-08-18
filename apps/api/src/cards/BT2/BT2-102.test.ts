import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-102.js";

describe("BT2-102 Terrors Cluster", () => {
  it("returns a suspended opposing Digimon to deck bottom", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-042"], hand: [{ card: "BT2-102", as: "option" }] },
        1: {
          battleArea: [{ card: "BT2-045", as: "target", suspended: true, under: [{ card: "BT2-001", as: "source" }] }],
          deck: ["BT2-043"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT2-045");
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT2-042");
  });

  it("offers only suspended opposing Digimon as targets", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-042", as: "ownSuspended", suspended: true }],
        hand: [{ card: "BT2-102", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT2-045", as: "suspendedFirst", suspended: true },
          { card: "BT2-046", as: "suspendedSecond", suspended: true },
          { card: "BT2-047", as: "unsuspended" },
        ],
      },
    });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;

    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("suspendedFirst").permanentId, s.perm("suspendedSecond").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).toHaveLength(2);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("unsuspended").permanentId);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("ownSuspended").permanentId);
  });

  it("does not return an unsuspended opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT2-042"], hand: [{ card: "BT2-102", as: "option" }] },
      1: { battleArea: [{ card: "BT2-045", as: "target" }], deck: ["BT2-043"] },
    });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck.at(-1)!.cardId).toBe("BT2-043");
  });

  it("activates its Main return-to-deck effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT2-102", as: "securityOption", faceUp: true }] },
        1: {
          battleArea: [{ card: "BT2-045", as: "target", suspended: true, under: [{ card: "BT2-001", as: "source" }] }],
          deck: ["BT2-043"],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT2-045");
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });
});
