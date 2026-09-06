import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT25_030 } from "./BT25-030.js";
import "../index.js";

describe("BT25-030 Elecmon", () => {
  it("makes the Start of Your Main Phase memory gain payable by adding top security", () => {
    const effect = BT25_030.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "securityToHand", controller: "mine", amount: 1 },
    });
  });

  it("only grants inherited Recovery +1 when the security stack is empty", () => {
    const effect = BT25_030.effects?.find((entry) => entry.isInherited);
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "toHand",
      controller: "mine",
      amount: 1,
      toTop: true,
      optional: true,
    });
    expect(effect?.actions?.[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Recovery", amount: 1 },
      condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "eq", value: 0 },
    });
  });

  it("naturally pays the start-of-main-phase cost and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-030", as: "elecmon" }],
          security: [{ card: "BT1-001", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 1 && s.state.players[0]!.security.length === 0);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("security").instanceId }),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("naturally recovers from zero security after the inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "host", under: ["BT25-030"] }],
          deck: [{ card: "BT1-001", as: "recovered" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === 1 &&
        s.state.players[0]!.security[0]!.instanceId === s.inst("recovered").instanceId,
    );

    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("recovered").instanceId, faceUp: false }),
    );
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
