import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-018 Monzaemon", () => {
  it("places Numemon from trash, gains memory, and debuffs one opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "RB1-018", as: "monzaemon" }], trash: ["RB1-017"] },
        1: { battleArea: [{ card: "RB1-024", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monzaemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 5000);

    expect(s.state.memory).toBe(5);
    expect(s.perm("monzaemon").stack.some((card) => card.cardId === "RB1-017")).toBe(true);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("does not pay the memory reward when no Numemon card is available to place", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "RB1-018", as: "monzaemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monzaemon").instanceId })).toEqual({
      ok: true,
    });

    expect(s.state.memory).toBe(3);
    expect(s.perm("monzaemon").stack).toHaveLength(0);
  });

  it("triggers the debuff on real digivolution and retains the Numemon source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-017", as: "base" }], hand: [{ card: "RB1-018", as: "monzaemon" }] },
        1: { battleArea: [{ card: "RB1-024", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("monzaemon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 5000);

    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["RB1-017"]);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("grants inherited Security Attack +1 only on your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-019", as: "host", under: [{ card: "RB1-018" }] }] },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("expires the play debuff after the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "RB1-018", as: "monzaemon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "RB1-024", as: "target" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monzaemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 5000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    const yourTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await yourTurn;
    const opponentTurn = s.engine.runOneTurn();
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect(s.perm("target").currentDP).toBe(8000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });
});
