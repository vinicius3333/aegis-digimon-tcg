import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-111.js";

describe("BT2-111 Beelzemon", () => {
  it("digivolves from Impmon for 4 with 10 cards in trash, ignoring requirements", async () => {
    const trash = Array.from({ length: 10 }, (_, index) => ({
      card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
    }));
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-068", as: "impmon" }], hand: [{ card: "BT2-111", as: "beelzemon" }], trash },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impmon").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("impmon").topCard?.cardId === "BT2-111");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash).toHaveLength(10);
  });

  it("rejects the Impmon shortcut with fewer than 10 cards in trash", () => {
    const trash = Array.from({ length: 9 }, (_, index) => ({
      card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
    }));
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-068", as: "impmon" }], hand: [{ card: "BT2-111", as: "beelzemon" }], trash },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impmon").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("does not treat Impmon (X Antibody) as the exact [Impmon] base", () => {
    const trash = Array.from({ length: 10 }, (_, index) => ({
      card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
    }));
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-073", as: "impmonX" }], hand: [{ card: "BT2-111", as: "beelzemon" }], trash },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impmonX").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("Q1042 rejects the Impmon shortcut in the breeding area", () => {
    const trash = Array.from({ length: 10 }, (_, index) => ({
      card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
    }));
    const s = setupEngine({
      0: {
        breeding: { card: "BT2-068", as: "impmon" },
        hand: [{ card: "BT2-111", as: "beelzemon" }],
        trash,
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impmon").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("When Digivolving selects one opposing level 4 or lower Digimon and excludes level 5", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-077", as: "base" }], hand: [{ card: "BT2-111", as: "evolving" }] },
      1: {
        battleArea: [
          { card: "BT2-013", as: "first" },
          { card: "BT2-044", as: "second" },
          { card: "BT2-046", as: "levelFive" },
        ],
      },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).toHaveLength(2);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("levelFive").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT2-013", "BT2-046"]);
  });
});
