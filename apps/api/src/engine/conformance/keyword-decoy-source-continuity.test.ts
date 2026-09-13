import { beforeEach, describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

describe("Decoy continuous source", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0236",
      "16-18: Decoy is granted to another same-name Digimon while the source remains eligible",
      "311375329fc7791aba6a16b180691e3063bce3bba790f4f92dff802e21987ca1",
    );
  });

  it("removes a P-045 inherited Decoy grant when its Armageddemon source leaves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-084", as: "attacker", dp: 15000 }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT5-085", under: ["P-045"], as: "source", suspended: true },
          { card: "BT5-085", as: "recipient" },
        ],
        security: [{ card: "BT1-009", as: "security" }],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const source = s.perm("source");
    const recipient = s.perm("recipient");
    const sourceId = source.topCard.instanceId;
    const inheritedSourceId = source.stack.find(({ cardId }) => cardId === "P-045")!.instanceId;
    const recipientId = recipient.topCard.instanceId;
    const attackerId = s.perm("attacker").topCard.instanceId;
    expect(observe(s.engine).hasKeyword(recipient, "Decoy")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: source.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined, 5000);
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(sourceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(inheritedSourceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(attackerId);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([recipientId]);
    expect(observe(s.engine).hasKeyword(recipient, "Decoy")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the continuous Decoy grant while its source remains in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }], deck: ["BT1-010"] },
      1: {
        battleArea: [
          { card: "BT5-085", under: ["P-045"], as: "source", suspended: true },
          { card: "BT5-085", as: "recipient" },
        ],
        security: [{ card: "BT1-009", as: "security" }],
        deck: ["BT1-010"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const source = s.perm("source");
    const recipient = s.perm("recipient");
    expect(observe(s.engine).hasKeyword(recipient, "Decoy")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: source.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([
      source.permanentId,
      recipient.permanentId,
    ]);
    expect(observe(s.engine).hasKeyword(recipient, "Decoy")).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
