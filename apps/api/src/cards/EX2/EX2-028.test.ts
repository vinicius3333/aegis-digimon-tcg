import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-028.js";
import "./EX2-029.js";

describe("EX2-028 Parasitemon", () => {
  it("gives its host +2000 DP and Security Attack +1 during its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-029", as: "host", under: ["EX2-028"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(15000);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("keeps Security Attack +1 on the opponent's turn but not the inherited DP boost", async () => {
    const ownTurn = setupEngine({
      0: { battleArea: [{ card: "EX2-029", as: "host", under: ["EX2-028"] }] },
      1: { deck: ["BT1-001"] },
    });
    await ownTurn.ready();
    expect(ownTurn.perm("host").currentDP).toBe(15000);
    expect(observe(ownTurn.engine).keywordAmount(ownTurn.perm("host"), "SecurityAttack")).toBe(1);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "EX2-029", as: "host", under: ["EX2-028"] }] },
      1: { hand: ["BT1-009"], deck: ["BT1-001"] },
    });
    await opponentTurn.ready();
    const turnLoop = opponentTurn.engine.startTurnLoop();
    await advance(opponentTurn.engine).waitForMainPhase(0);
    advance(opponentTurn.engine).endMainPhaseIfOpen(0);
    await advance(opponentTurn.engine).waitForMainPhase(1);
    expect(opponentTurn.perm("host").currentDP).toBe(13000);
    expect(observe(opponentTurn.engine).keywordAmount(opponentTurn.perm("host"), "SecurityAttack")).toBe(1);
    expect(opponentTurn.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("places itself under another Digimon at end of attack, never under itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-028", as: "parasite", under: [{ card: "EX2-025", as: "parasiteSource" }] },
            { card: "EX2-014", as: "other", under: [{ card: "EX2-025", as: "existingSource" }] },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("parasite").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").stack.some((card) => card.instanceId === s.inst("parasite").instanceId));
    expect(s.perm("other").stack.map((card) => card.cardId)).toEqual(["EX2-028", "EX2-025"]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("parasiteSource").instanceId)).toBe(
      true,
    );
  });

  it("may decline placing itself under another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-028", as: "parasite" },
            { card: "EX2-014", as: "other" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("parasite").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-028")).toBe(true);
    expect(s.perm("other").stack.some((card) => card.cardId === "EX2-028")).toBe(false);
  });
});
