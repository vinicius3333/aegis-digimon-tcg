import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-036 Proximamon", () => {
  it("rejects the alternate cost when Siriusmon lacks an Arcturusmon digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "LM-001", as: "siriusmon" }], hand: [{ card: "RB1-036", as: "proximamon" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("siriusmon").permanentId,
        instanceId: s.inst("proximamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("uses the exact alternate cost 3 when Siriusmon has an Arcturusmon source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "LM-001", as: "siriusmon", under: ["RB1-031"] }],
        hand: [{ card: "RB1-036", as: "proximamon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("siriusmon").permanentId,
        instanceId: s.inst("proximamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("siriusmon").topCard?.cardId === "RB1-036");
    expect(s.perm("siriusmon").topCard?.cardId).toBe("RB1-036");
    expect(s.state.memory).toBe(0);
  });

  it("places the exact Gammamon-text card and deletes an opposing Digimon within its DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-036", as: "proximamon" }], hand: [{ card: "RB1-005", as: "gammamon" }] },
        1: { battleArea: [{ card: "RB1-005", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    const gammamonInstanceId = s.inst("gammamon").instanceId;

    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    await settle(() => s.perm("proximamon").stack.some((card) => card.instanceId === gammamonInstanceId));

    expect(s.perm("proximamon").stack.some((card) => card.instanceId === gammamonInstanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === gammamonInstanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("may revive a level 4 or lower Gammamon from trash when another Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-036", as: "proximamon" }], trash: [{ card: "RB1-005", as: "gammamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "RB1-005"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "RB1-005")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "RB1-005")).toBe(false);
  });

  it("accepts a Gammamon-text card from trash and declines the once-per-turn end-turn effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-036", as: "proximamon" }], trash: [{ card: "RB1-005", as: "gammamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("proximamon").stack.some((card) => card.cardId === "RB1-005")).toBe(false);
  });

  it("uses the post-placement DP and accepts equality while rejecting a higher target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-036", as: "proximamon" }], hand: [{ card: "RB1-005", as: "gammamon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 17000, as: "equal" },
            { card: "BT1-014", dp: 17001, as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const equalId = s.perm("equal").permanentId;
    const higherId = s.perm("higher").permanentId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === equalId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === higherId)).toBe(true);
  });

  it("revives at most one Gammamon per turn, then permits another revival on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-036", as: "proximamon" }],
          trash: [
            { card: "RB1-005", as: "first" },
            { card: "RB1-005", as: "second" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim1" },
            { card: "BT1-010", as: "victim2" },
            { card: "BT1-014", as: "victim3" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const victim1Id = s.perm("victim1").permanentId;
    const victim2Id = s.perm("victim2").permanentId;
    const victim3Id = s.perm("victim3").permanentId;
    await advance(s.engine).verb.deletePermanent([victim1Id], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "RB1-005").length === 1);
    await advance(s.engine).verb.deletePermanent([victim2Id], "byEffect");
    await settle(() => false, 20);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "RB1-005")).toHaveLength(1);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = advance(s.engine).runTurn(1);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.deletePermanent([victim3Id], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "RB1-005").length === 2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "RB1-005")).toHaveLength(2);
  });
});
