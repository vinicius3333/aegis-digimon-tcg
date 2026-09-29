import { describe, expect, it } from "vitest";
import { compiled } from "./ST18-05.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./ST18-03.js";
import "./ST18-10.js";

describe("ST18-05 Muchomon", () => {
  it("expires its effect-suspension bonus at the end of the opponent's turn", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            actions: [
              expect.objectContaining({
                kind: "ModifyDP",
                amount: 3000,
                duration: "untilOpponentTurnEnd",
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("reacts only when this Digimon is suspended by an effect", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-001", "BT1-002"],
        battleArea: [
          { card: "ST18-05", as: "muchomon" },
          { card: "ST18-10", as: "vortexTarget" },
        ],
      },
      1: { deck: ["BT1-001", "BT1-002"], battleArea: [{ card: "ST18-03", as: "victim" }] },
    });
    const before = s.perm("vortexTarget").currentDP;
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("victim").permanentId], 1);
    await settle(() => false, 60);
    expect(s.perm("vortexTarget").currentDP).toBe(before);

    await advance(s.engine).verb.suspend([s.perm("muchomon").permanentId], 1);
    await settle(() => s.perm("vortexTarget").currentDP === before + 3000);
    expect(s.perm("vortexTarget").currentDP).toBe(before + 3000);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(s.perm("vortexTarget").currentDP).toBe(before);
  });

  it("does not fire its once-per-turn buff twice in the same turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST18-05", as: "muchomon" },
            { card: "ST18-10", as: "first" },
            { card: "ST18-10", as: "second" },
          ],
        },
        1: { deck: ["BT1-001", "BT1-002"] },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    const before = s.perm("first").currentDP;
    await advance(s.engine).verb.suspend([s.perm("muchomon").permanentId], 1);
    await settle(() => s.perm("first").currentDP === before + 3000);
    await advance(s.engine).verb.unsuspend([s.perm("muchomon").permanentId]);
    preferInstanceIds.push(s.perm("second").permanentId);
    await advance(s.engine).verb.suspend([s.perm("muchomon").permanentId], 1);
    await settle();
    expect(s.perm("first").currentDP).toBe(before + 3000);
    expect(s.perm("second").currentDP).toBe(before);
  });

  it("triggers when an opponent effect suspends Muchomon itself", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST18-05", as: "muchomon" },
          { card: "ST18-10", as: "target" },
        ],
      },
      1: { battleArea: [{ card: "ST18-03", as: "opponentEffect" }] },
    });
    const before = s.perm("target").currentDP;
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("muchomon").permanentId], 1);
    await settle(() => s.perm("target").currentDP === before + 3000);
    expect(s.perm("target").currentDP).toBe(before + 3000);
  });

  it("resets its once-per-turn trigger on a later turn for a different target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST18-05", as: "muchomon" },
            { card: "ST18-10", as: "first" },
            { card: "ST18-10", as: "second" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { deck: ["BT1-003", "BT1-004"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const before = s.perm("first").currentDP;
    preferred.push(s.perm("first").permanentId);
    await advance(s.engine).verb.suspend([s.perm("muchomon").permanentId], 1);
    await settle(() => s.perm("first").currentDP === before + 3000);
    await advance(s.engine).verb.unsuspend([s.perm("muchomon").permanentId]);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferred.splice(0, preferred.length, s.perm("second").permanentId);
    await advance(s.engine).verb.suspend([s.perm("muchomon").permanentId], 1);
    await settle(() => s.perm("second").currentDP === before + 3000);
    expect(s.perm("first").currentDP).toBe(before);
    expect(s.perm("second").currentDP).toBe(before + 3000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});

describe("ST18-05 Muchomon — KB Q&A rulings", () => {
  it("triggers whether its own player's effect or the opponent's effect suspends it (Q841)", async () => {
    const ownPreferred: string[] = [];
    const own = setupEngine(
      {
        0: {
          hand: [{ card: "ST18-10", as: "grandGalemon" }],
          battleArea: [
            { card: "ST18-05", as: "muchomon" },
            { card: "ST18-02", as: "bird" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: ownPreferred },
    );
    ownPreferred.push(own.perm("muchomon").topCard!.instanceId, own.perm("bird").topCard!.instanceId);
    own.state.memory = 7;
    await own.ready();
    const ownBefore = own.perm("bird").currentDP;
    expect(own.engine.applyIntent(0, { type: "playCard", instanceId: own.inst("grandGalemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => own.perm("bird").currentDP === ownBefore + 3000);
    expect(own.perm("muchomon").isSuspended).toBe(true);
    expect(own.perm("opponentDigimon").isSuspended).toBe(false);
    expect(own.perm("bird").currentDP).toBe(ownBefore + 3000);

    const opponentPreferred: string[] = [];
    const opponent = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST18-05", as: "muchomon" },
            { card: "ST18-02", as: "bird" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "ST18-03", as: "falcomon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: opponentPreferred },
    );
    opponentPreferred.push(opponent.perm("muchomon").topCard!.instanceId, opponent.perm("bird").topCard!.instanceId);
    opponent.state.turnSeat = 1;
    opponent.state.memory = 0;
    await opponent.ready();
    const opponentBefore = opponent.perm("bird").currentDP;
    expect(
      opponent.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: opponent.perm("falcomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.perm("bird").currentDP === opponentBefore + 3000);
    expect(opponent.perm("muchomon").isSuspended).toBe(true);
    expect(opponent.perm("bird").currentDP).toBe(opponentBefore + 3000);
  });
});
