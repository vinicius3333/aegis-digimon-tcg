import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-036.js";

describe("EX2-036 GroundLocomon", () => {
  it("can attack players and gains 1000 DP per Cyborg or Machine in trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-036", as: "groundLocomon" }], trash: ["EX2-031", "EX2-034", "EX2-014"] },
      1: { security: ["BT1-001"] },
    });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("groundLocomon"), "cantAttackDigimon")).toBe(true);
    expect(s.perm("groundLocomon").currentDP).toBe(13000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("groundLocomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("can't choose an opponent's suspended Digimon as its attack target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-036", as: "groundLocomon" }] },
      1: { battleArea: [{ card: "EX2-031", as: "target", suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("groundLocomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("keeps its trash-based DP bonus on the opponent's turn but only restricts attacks on its own turn", async () => {
    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "EX2-036", as: "groundLocomon" }], trash: ["EX2-031", "EX2-034"] },
      1: { hand: ["BT1-009"], deck: ["BT1-001"] },
    });
    await opponentTurn.ready();
    const turnLoop = opponentTurn.engine.startTurnLoop();
    await advance(opponentTurn.engine).waitForMainPhase(0);
    advance(opponentTurn.engine).endMainPhaseIfOpen(0);
    await advance(opponentTurn.engine).waitForMainPhase(1);
    expect(opponentTurn.perm("groundLocomon").currentDP).toBe(13000);
    expect(observe(opponentTurn.engine).isRestricted(opponentTurn.perm("groundLocomon"), "cantAttackDigimon")).toBe(
      false,
    );
    expect(opponentTurn.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;

    const ownTurn = setupEngine({
      0: { battleArea: [{ card: "EX2-036", as: "groundLocomon" }], trash: ["EX2-031", "EX2-034"] },
      1: { deck: ["BT1-001"] },
    });
    await ownTurn.ready();
    expect(ownTurn.perm("groundLocomon").currentDP).toBe(13000);
    expect(observe(ownTurn.engine).isRestricted(ownTurn.perm("groundLocomon"), "cantAttackDigimon")).toBe(true);
  });
});
