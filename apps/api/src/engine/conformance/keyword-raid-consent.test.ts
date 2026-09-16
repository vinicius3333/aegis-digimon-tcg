import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/BT24/index.js";

const RAID_FINGERPRINT = "3fc3398eb955b3c6e0d902b4e6a8719d1b767d125d2df06f233802288c3f6b12";

describe("Raid public target choice", () => {
  it("chooses one of two equal highest-DP unsuspended targets", async () => {
    cite(
      "comprehensive-0242",
      "§16-23-1/3/4: Raid optionally switches to the highest-DP unsuspended Digimon, with a player choice on ties",
      RAID_FINGERPRINT,
    );
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-011", as: "attacker", dp: 12000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstHigh", dp: 5000 },
            { card: "BT1-010", as: "secondHigh", dp: 5000 },
          ],
          security: [{ card: "BT1-009", as: "security" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false },
    );
    const firstId = s.perm("firstHigh").topCard.instanceId;
    const secondId = s.perm("secondHigh").topCard.instanceId;
    const secondPermanentId = s.perm("secondHigh").permanentId;
    const attackerId = s.perm("attacker").topCard.instanceId;
    const securityId = s.inst("security").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson ?? "{}");
    expect(payload.candidateInstanceIds).toEqual(expect.arrayContaining([firstId, secondId]));
    expect(payload.candidateInstanceIds).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [secondId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === secondId) &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(secondId);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([firstId]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(attackerId);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    // The switch re-narrates the attack that is already open. Flagging it is what stops the
    // client from playing a second declaration — its sound, announcement and lunge at a
    // security stack the attack no longer points at.
    const declarations = s.events.filter((event) => event.kind === "attackDeclared");
    expect(declarations).toHaveLength(2);
    expect(declarations[0]).toMatchObject({ target: { kind: "player" } });
    expect(declarations[0]).not.toHaveProperty("redirected");
    expect(declarations[1]).toMatchObject({
      target: { kind: "permanent", permanentId: secondPermanentId },
      redirected: true,
    });
  });
});
