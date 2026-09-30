import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-035 Hokuto Amanokawa", () => {
  it("plays itself from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "RB1-035", as: "securityHokuto" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const securityCard = s.inst("securityHokuto");
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === securityCard.instanceId));
    expect(s.state.players[0]!.security.some((c) => c.instanceId === securityCard.instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === securityCard.instanceId)).toBe(true);
  });

  it("gains 1 memory at the start of its turn when the opponent has 3 Tamers", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-035", as: "hokuto" }] },
      1: {
        battleArea: [
          { card: "BT1-085", as: "tamer1" },
          { card: "BT1-086", as: "tamer2" },
          { card: "BT1-087", as: "tamer3" },
        ],
      },
    });
    s.state.memory = 0;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not gain memory when the opponent has fewer than 3 Tamers", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-035", as: "hokuto" }] },
      1: {
        battleArea: [
          { card: "BT1-085", as: "tamer1" },
          { card: "BT1-086", as: "tamer2" },
        ],
      },
    });
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("suspends to draw once when the opponent plays one or more level 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-035", as: "hokuto" }], deck: ["BT1-009"] },
        1: {
          trash: [
            { card: "BT1-009", as: "level3a" },
            { card: "BT1-009", as: "level3b" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const handBefore = s.state.players[0]!.hand.length;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("level3a").instanceId, s.inst("level3b").instanceId]);

    expect(s.perm("hokuto").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
    expect(s.state.memory).toBe(0);
  });

  it("applies both rewards once when level 3 and level 4 Digimon are played simultaneously", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-035", as: "hokuto" }], deck: ["BT1-009"] },
        1: {
          trash: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const handBefore = s.state.players[0]!.hand.length;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("level3").instanceId, s.inst("level4").instanceId]);

    expect(s.perm("hokuto").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
    expect(s.state.memory).toBe(-1);
  });

  it("may suspend for a level-less Digimon but receives neither reward", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-035", as: "hokuto" }], deck: ["BT1-009"] },
        1: { trash: [{ card: "EX2-045", as: "levelLess" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const handBefore = s.state.players[0]!.hand.length;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("levelLess").instanceId]);

    expect(s.perm("hokuto").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.memory).toBe(0);
  });
});

describe("RB1-035 Hokuto Amanokawa — KB Q&A rulings", () => {
  async function opponentPlays(cardIds: string[]) {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-035", as: "hokuto" }], deck: ["BT1-009", "BT1-010"] },
        1: { trash: cardIds.map((card, index) => ({ card, as: `played${index}` })) },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.playInstances(cardIds.map((_, index) => s.inst(`played${index}`).instanceId));
    await settle();
    return {
      suspended: s.perm("hokuto").isSuspended,
      drawn: s.state.players[0]!.hand.length,
      memoryGained: 0 - s.state.memory,
      offers: s.decisions.filter(({ seat, req }) => seat === 0 && req.kind === "optional").length,
    };
  }

  it("may suspend when the opponent plays a Lv.- Digimon, gaining neither memory nor a draw (Q4109)", async () => {
    expect(await opponentPlays(["EX2-045"])).toEqual({ suspended: true, drawn: 0, memoryGained: 0, offers: 1 });
  });

  it("gains 1 memory and draws 1 when a level 3 and a level 4 Digimon are played together (Q4110)", async () => {
    expect(await opponentPlays(["BT1-009", "BT1-014"])).toEqual({
      suspended: true,
      drawn: 1,
      memoryGained: 1,
      offers: 1,
    });
  });

  it("draws or gains memory only once when two Digimon of the same level band are played together (Q4111)", async () => {
    expect(await opponentPlays(["BT1-009", "BT1-009"])).toEqual({
      suspended: true,
      drawn: 1,
      memoryGained: 0,
      offers: 1,
    });
    expect(await opponentPlays(["BT1-014", "BT1-014"])).toEqual({
      suspended: true,
      drawn: 0,
      memoryGained: 1,
      offers: 1,
    });
  });
});
