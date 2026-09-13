import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

const KB_SHA256 = "e44a7d2f8998a34292f9974cbca448cd81f2fbf538af8c3db0e1def0b7b44f2b";

describe("Alliance public consent and payment", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0243",
      "§16-24-1: when an attacking Digimon suspends one of its other Digimon, add that ally's DP for the attack",
      KB_SHA256,
    );
  });

  it("lets the controller choose one exact ally and applies its DP to the battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-009", as: "attacker" },
            { card: "BT1-009", as: "allyA", dp: 3000 },
            { card: "BT1-010", as: "allyB", dp: 5000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-080", as: "defender", dp: 16000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    const attacker = s.perm("attacker");
    const allyA = s.perm("allyA");
    const allyB = s.perm("allyB");
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    const prompt = s.events.find((event) => event.kind === "alliancePrompt");
    expect(prompt?.kind).toBe("alliancePrompt");
    expect(prompt?.eligibleAllyIds).toEqual([allyA.permanentId, allyB.permanentId]);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: allyB.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(allyB.isSuspended).toBe(true);
    expect(allyA.isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("defender").instanceId);
  });

  it("allows public refusal while preserving every eligible ally and completing the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-009", as: "attacker" },
            { card: "BT1-009", as: "allyA", dp: 3000 },
            { card: "BT1-010", as: "allyB", dp: 5000 },
          ],
        },
        1: { security: ["BT1-011", "BT1-012"] },
      },
      { autoSelectCards: true },
    );
    const attacker = s.perm("attacker");
    const allyA = s.perm("allyA");
    const allyB = s.perm("allyB");
    const securityIds = s.state.players[1]!.security.map((card) => card.instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    const prompt = s.events.find((event) => event.kind === "alliancePrompt");
    expect(prompt?.kind).toBe("alliancePrompt");
    expect(prompt?.eligibleAllyIds).toEqual([allyA.permanentId, allyB.permanentId]);
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    expect(attacker.currentDP).toBe(attacker.baseDP);

    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(allyA.isSuspended).toBe(false);
    expect(allyB.isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([securityIds[0]]);
  });
});
