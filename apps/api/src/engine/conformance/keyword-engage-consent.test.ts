import { beforeEach, describe, expect, it } from "vitest";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

describe("Engage public consent", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0321",
      "16-44: Engage may attack at the end of your turn and its processing is optional",
      "99aee84d9f3173f72f5b31fef5c7c24e42fa945d870591b967ce5dfcb24ea439",
    );
  });

  it("declines the natural End of Your Turn attack without changing board or security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-016", as: "attacker" }] },
        1: {
          security: [
            { card: "BT1-009", as: "security0" },
            { card: "BT1-010", as: "security1" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const attacker = s.perm("attacker");
    const attackerInstanceId = attacker.topCard.instanceId;
    const securityIds = s.state.players[1]!.security.map(({ instanceId }) => instanceId);

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(decision.seat).toBe(0);
    expect(JSON.stringify(decision)).toMatch(/Engage|BT26-016|attack/i);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await turn;

    expect(
      s.state.players[0]!.battleArea.some(
        ({ topCard, isSuspended }) => topCard.instanceId === attackerInstanceId && !isSuspended,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });
});
