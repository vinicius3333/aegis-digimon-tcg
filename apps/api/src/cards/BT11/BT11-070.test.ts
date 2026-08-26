import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT11-070.js";
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
  });

  it("resolves the reveal-and-trash timing", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT11-070", as: "destromon" }], deck: ["BT1-001"] } },
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

  it("redirects an opponent attack by returning 2 Vemmon from one Galacticmon stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-111", as: "galacticmon", under: ["BT11-070", "BT11-061", "BT11-061"] }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.deck.filter(({ cardId }) => cardId === "BT11-061")).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-010");
  });
});
