import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-053.js";

describe("BT8-053 Lighdramon", () => {
  it("suspends an opposing level-4-or-lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-021", as: "base" }], hand: [{ card: "BT8-053", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT1-015", as: "target" },
            { card: "BT8-042", as: "levelFive" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.state.memory).toBe(2);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("levelFive").isSuspended).toBe(false);
  });

  it("activates Armor Purge to prevent effect deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT8-053", as: "lighdramon", under: ["BT1-064"] }] } },
      { autoSelectCards: true },
    );
    const permanentId = s.perm("lighdramon").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([permanentId], "byEffect");

    expect(s.perm("lighdramon").permanentId).toBe(permanentId);
    expect(s.perm("lighdramon").topCard.cardId).toBe("BT1-064");
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT8-053")).toBe(true);
  });

  it("offers Armor Purge after losing a battle and accepts the manual decision", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 9_000 }] },
      1: { battleArea: [{ card: "BT8-053", as: "lighdramon", under: ["BT1-064"], suspended: true }] },
    });
    const permanentId = s.perm("lighdramon").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.state.pendingDecision!;
    expect(JSON.parse(decision.payloadJson)).toMatchObject({
      candidateInstanceIds: [s.perm("lighdramon").topCard.instanceId],
      min: 0,
      max: 1,
    });
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.perm("lighdramon").topCard.instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("lighdramon").topCard.cardId === "BT1-064");
    expect(s.perm("lighdramon").permanentId).toBe(permanentId);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT8-053")).toBe(true);
  });

  it("offers Armor Purge after losing a Security Digimon battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-053", as: "lighdramon", under: ["BT1-064"] }] },
      1: { security: ["BT4-114"] },
    });
    const permanentId = s.perm("lighdramon").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const armorInstanceId = s.perm("lighdramon").topCard.instanceId;
    expect(JSON.parse(decision.payloadJson)).toMatchObject({
      candidateInstanceIds: [armorInstanceId],
      min: 0,
      max: 1,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [armorInstanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("lighdramon").topCard.cardId === "BT1-064");
    expect(s.perm("lighdramon").permanentId).toBe(permanentId);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT8-053")).toBe(true);
  });
});
