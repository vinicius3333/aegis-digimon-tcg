import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT11-070.js";
import "./BT11-111.js";
describe("BT11-070 Destromon", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-070")).toMatchObject({
      cardId: "BT11-070",
      colors: ["Black"],
      level: 5,
      playCost: 10,
      dp: 10000,
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "WhenDigivolving", actions: [{ kind: "RevealAdd", revealCount: 3 }, { kind: "Delete" }] },
      { trigger: "OpponentsTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger" }] },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Vemmon"], cost: 6, isAlternate: true }]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ add: [{ underFilter: { isSelfRef: true } }] });
  });

  it("resolves the reveal-and-trash timing", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT11-070", as: "destromon" }], deck: ["BT1-009"] } },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("destromon"));
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("places a revealed Vemmon under itself, trashes the rest, and deletes a Tamer at 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-070", as: "destromon", under: ["BT11-061", "BT11-061", "BT11-061", "BT11-061"] }],
          deck: ["BT11-061", "BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-088", as: "tamer" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("destromon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("destromon").stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(5);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
  });

  it("digivolves for 6 from Vemmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-061", as: "vemmon" }],
        hand: [{ card: "BT11-070", as: "destromon" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("vemmon").permanentId,
        instanceId: s.inst("destromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("vemmon").topCard.cardId === "BT11-070");

    expect(s.state.memory).toBe(4);
  });

  it("redirects the first opponent attack each turn and returns exactly 2 Vemmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT11-111",
              as: "galacticmon",
              under: [
                "BT11-070",
                { card: "BT11-061", as: "vemmon1" },
                { card: "BT11-061", as: "vemmon2" },
                { card: "BT11-061", as: "vemmon3" },
                { card: "BT11-061", as: "vemmon4" },
              ],
            },
            { card: "BT1-013", as: "spare" },
          ],
          deck: Array.from({ length: 8 }, () => "BT1-013"),
          security: Array.from({ length: 4 }, () => "BT1-013"),
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attacker1", dp: 1000 },
            { card: "BT1-010", as: "attacker2", dp: 1000 },
            { card: "BT1-010", as: "attacker3", dp: 1000 },
          ],
          deck: Array.from({ length: 8 }, () => "BT1-013"),
          security: Array.from({ length: 4 }, () => "BT1-013"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("galacticmon").permanentId;
    const attackerIds = [
      s.perm("attacker1").permanentId,
      s.perm("attacker2").permanentId,
      s.perm("attacker3").permanentId,
    ];
    const vemmonIds = ["vemmon1", "vemmon2", "vemmon3", "vemmon4"].map((alias) => s.inst(alias).instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    for (const attackerId of attackerIds.slice(0, 2)) {
      expect(
        s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(true);
      expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(false);
      expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(
        expect.arrayContaining([vemmonIds[0], vemmonIds[1]]),
      );
      expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).not.toEqual(
        expect.arrayContaining([vemmonIds[2], vemmonIds[3]]),
      );
      expect(s.perm("galacticmon").stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(2);
    }
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerIds[2]!, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("galacticmon").stack.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining(vemmonIds));
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextOpponentTurn;
  });
});
