import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-101 Cross Arts", () => {
  it("uses the TS Use Requirement, grants Blocker/+3000, and deletes within the DP threshold", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-101", as: "option" }],
          battleArea: [
            { card: "BT24-014", dp: 8000, as: "tsDigimon" },
            { card: "BT26-090", as: "namedTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT24-009", dp: 7000, as: "victim" }, { card: "BT24-010", dp: 12000, as: "safe" }] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;
    const victimInstanceId = s.perm("victim").topCard!.instanceId;
    expect((s.engine as unknown as { continuous: { hasColorWaiver(id: string): boolean } }).continuous.hasColorWaiver(s.inst("option").instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.perm("tsDigimon").currentDP).toBe(11000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("option").instanceId)).toBe(false);
    const ledger = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }).continuous;
    expect(ledger.hasKeyword(s.perm("tsDigimon").permanentId, "Blocker")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === victimInstanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT24-010")).toBe(true);
  });

  it("supports the unsuspend modal choice", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-101", as: "option" }],
        battleArea: [{ card: "BT24-014", suspended: true, as: "tsDigimon" }],
      },
    }, { autoSelectCards: true });
    await s.ready();
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "chooseOption"));
    const decision = s.decisions.find(({ req }) => req.kind === "chooseOption");
    if (decision === undefined) throw new Error("Cross Arts modal decision not found");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.req.decisionId,
      response: { kind: "chooseOption", optionIndex: 1 },
    })).toEqual({ ok: true });
    await settle(() => !s.perm("tsDigimon").isSuspended);
    expect(s.perm("tsDigimon").isSuspended).toBe(false);
  });

  it("plays a low-cost TS card from trash from Security", async () => {
    const s = setupEngine({
      0: { trash: [{ card: "BT24-009", as: "tsTarget" }], security: [{ card: "BT26-101", as: "securityCard" }, "AD1-001"] },
      1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const decision = s.decisions.find(({ req }) => req.kind === "selectCards");
    if (decision === undefined) throw new Error("Security TS-card decision not found");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.req.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("tsTarget").instanceId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tsTarget").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tsTarget").instanceId)).toBe(true);
  });
});
