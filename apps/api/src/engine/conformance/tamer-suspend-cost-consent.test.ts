import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

function board(rinaSuspended = false) {
  return setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT11-112", as: "rina", suspended: rinaSuspended },
          { card: "BT22-023", as: "aero" },
        ],
        security: ["BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "victim" }],
        security: [{ card: "BT1-009", as: "security" }],
      },
    },
    { autoAcceptOptional: false, autoSelectCards: true },
  );
}

describe("BT11-112 suspend-as-triggered-cost consent", () => {
  beforeEach(() => {
    cite("comprehensive-0169", "§15-7 optional processing conditions", "255a54ddb16e8b3afbf5e0e984ade2a3525df85fae97c11e90af762d2932bc0b");
    cite("comprehensive-0177", "§15-8-5 immediate-type effects trigger then may be activated", "50033be9509953fb2b00c56799e11cee1838740d4c5c06a962969a748a6fcdde");
  });
  it("asks Rina's controller and, when accepted, suspends Rina and replays Aero's public effect", async () => {
    const s = board();
    const victimId = s.perm("victim").permanentId;
    const victimInstanceId = s.inst("victim").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("aero").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.perm("rina").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(true);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.perm("rina").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(victimInstanceId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("aero").permanentId)).toBe(true);
  });

  it("refusal leaves Rina and the legal opponent target unchanged", async () => {
    const s = board();
    const victimId = s.perm("victim").permanentId;
    await s.ready();
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("aero").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "optional", accept: false },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.perm("rina").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(true);
  });

  it("does not offer the unpayable triggered clause when Rina is already suspended", async () => {
    const s = board(true);
    const victimId = s.perm("victim").permanentId;
    await s.ready();
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("aero").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.perm("rina").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(true);
  });
});
