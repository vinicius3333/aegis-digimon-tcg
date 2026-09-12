import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-031 Arcturusmon", () => {
  it("places an exact Gammamon from trash and deletes only within its stack-count level cap", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-030", as: "base", under: [{ card: "RB1-005" }, { card: "RB1-005" }] }],
          hand: [{ card: "RB1-031", as: "arcturus" }],
          trash: [{ card: "RB1-005", as: "gammamon" }],
        },
        1: { battleArea: [{ card: "RB1-005", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const gammamonInstanceId = s.inst("gammamon").instanceId;
    const priorStackIds = s.perm("base").stack.map((card) => card.instanceId);
    const oldTopId = s.perm("base").topCard.instanceId;
    const opponentPermanentId = s.perm("opponent").permanentId;

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("arcturus").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === gammamonInstanceId));

    expect(s.perm("base").stack.some((card) => card.instanceId === gammamonInstanceId)).toBe(true);
    expect(priorStackIds.every((id) => s.perm("base").stack.some((card) => card.instanceId === id))).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack[0]!.instanceId).toBe(gammamonInstanceId);
    expect(
      s
        .perm("base")
        .stack.slice(1)
        .map((card) => card.instanceId),
    ).toEqual([...priorStackIds, oldTopId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === gammamonInstanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentPermanentId)).toBe(
      false,
    );
  });

  it("chooses among own and opponent Digimon within the stack-count level cap", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-030", as: "base", under: [{ card: "RB1-005" }, { card: "RB1-005" }] },
            { card: "BT1-014", as: "ownVictim" },
          ],
          hand: [{ card: "RB1-031", as: "arcturus" }],
          trash: [{ card: "RB1-005", as: "gammamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "opponent" },
            { card: "BT1-020", as: "above" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const ownId = s.perm("ownVictim").permanentId;
    const opponentId = s.perm("opponent").permanentId;
    const aboveId = s.perm("above").permanentId;
    preferred.push(opponentId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("arcturus").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.sourceCardId === "RB1-031" && req.kind === "chooseTargets"));
    const decision = s.decisions.find(({ req }) => req.sourceCardId === "RB1-031" && req.kind === "chooseTargets")!.req;
    expect(decision.options?.candidateInstanceIds).toEqual(expect.arrayContaining([ownId, opponentId]));
    expect(decision.options?.candidateInstanceIds).not.toContain(aboveId);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === opponentId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === ownId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === aboveId)).toBe(true);
  });

  it("returns a trash Digimon, then trashes Siriusmon to play Proximamon on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-031", as: "arcturus" }],
          hand: [
            { card: "RB1-010", as: "sirius" },
            { card: "RB1-036", as: "proximamon" },
          ],
          trash: [{ card: "BT1-010", as: "returned" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("arcturus").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "RB1-036"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "RB1-010")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "RB1-036")).toBe(true);
  });

  it("trashes the opponent's security on an opponent deletion during your turn through its inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-036", as: "host", under: ["RB1-031"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-010"] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("limits inherited security trash to once per turn and resets after the opponent turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "RB1-036", as: "host", under: ["RB1-031"] }],
        deck: Array.from({ length: 8 }, () => "BT1-009"),
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-009", as: "second" },
          { card: "BT1-009", as: "third" },
        ],
        security: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        deck: Array.from({ length: 8 }, () => "BT1-009"),
      },
    });
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    const thirdId = s.perm("third").permanentId;
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([firstId], "byEffect");
    await settle(() => s.state.players[1]!.security.length === 4);
    await advance(s.engine).verb.deletePermanent([secondId], "byEffect");
    await settle();
    expect(s.state.players[1]!.security).toHaveLength(4);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.deletePermanent([thirdId], "byEffect");
    await settle(() => s.state.players[1]!.security.length === 3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    expect(s.state.players[1]!.security).toHaveLength(3);
  });
});
