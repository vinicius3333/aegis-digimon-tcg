import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT6/BT6-071.js";
import "./P-031.js";

type EngineInternals = {
  primitives: {
    deletePermanent(ids: string[], cause: "byEffect"): Promise<void>;
  };
};

describe("P-031 Gatomon", () => {
  it("recovers one card when played with exactly 3 security cards", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-031", as: "gatomon" }],
        deck: [{ card: "BT1-009", as: "recovered" }],
        security: ["BT1-028", "BT1-028", "BT1-028"],
      },
    });
    const recoveredId = s.inst("recovered").instanceId;
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gatomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === recoveredId));

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(recoveredId);
  });

  it("does not recover when played with 4 security cards", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-031", as: "gatomon" }],
        deck: [{ card: "BT1-009", as: "deck-top" }],
        security: ["BT1-028", "BT1-028", "BT1-028", "BT1-028"],
      },
    });
    const deckTopId = s.inst("deck-top").instanceId;
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gatomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === deckTopId)).toBe(true);
  });

  it("has Blocker on the opponent's turn only while a purple Digimon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-031", as: "gatomon" },
          { card: "BT4-079", as: "purple" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gatomon"), "Blocker")).toBe(true);

    await (s.engine as unknown as EngineInternals).primitives.deletePermanent(
      [s.perm("purple").permanentId],
      "byEffect",
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("gatomon"), "Blocker")).toBe(false);
  });

  it("does not have Blocker during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-031", as: "gatomon" },
          { card: "BT4-079", as: "purple" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("gatomon"), "Blocker")).toBe(false);
  });

  it("loses Blocker before reaction timing when When Attacking deletes its purple ally (Q4144)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-031", as: "gatomon" },
            { card: "BT4-079", as: "purple" },
          ],
          security: [{ card: "BT1-107", as: "security" }],
        },
        1: {
          battleArea: [{ card: "BT1-025", as: "attacker", under: ["BT6-071"] }],
          hand: [{ card: "BT1-009", as: "discardCost" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const purpleId = s.perm("purple").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("gatomon"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const deletePrompt = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)!.req;
    expect(deletePrompt.sourceCardId).toBe("BT6-071");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: deletePrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== purpleId) &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );

    expect(observe(s.engine).hasKeyword(s.perm("gatomon"), "Blocker")).toBe(false);
    expect(s.perm("gatomon").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "P-031")).toBe(false);
  });
});
