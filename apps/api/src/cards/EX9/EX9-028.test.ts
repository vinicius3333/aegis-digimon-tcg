import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-028.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

async function fireOnEndTurn(s: ReturnType<typeof setupEngine>): Promise<void> {
  await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
}

describe("EX9-028", () => {
  it("pays the evolution memory cost in addition to placing three sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-028", as: "source" }],
          trash: ["EX9-008", "EX9-035", "EX9-051"],
          hand: ["EX9-064"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await fireOnEndTurn(s);
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-064");
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(
      s
        .perm("source")
        .stack.slice(0, 3)
        .map(({ cardId }) => cardId)
        .sort(),
    ).toEqual(["EX9-008", "EX9-035", "EX9-051"]);
    expect(
      s
        .perm("source")
        .stack.slice(0, 3)
        .every(({ faceUp }) => faceUp === false),
    ).toBe(true);
    expect(s.perm("source").stack[3]!.cardId).toBe("EX9-028");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("once per turn can digivolve at end of turn by placing three Ver.4 Digimon from trash face down underneath", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand", "trash"],
          cost: {
            kind: "place",
            target: { count: 3 },
            faceDown: true,
            destination: "digivolutionStack",
            position: "bottom",
          },
        },
      ],
    });
  });
  it("resolves the end-of-turn digivolution through a real turn and preserves draw and zones", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-028", as: "source" }],
          trash: ["EX9-008", "EX9-035", "EX9-051"],
          hand: ["EX9-064"],
          deck: ["BT1-010", "BT1-046"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await settle();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-064", "BT1-010"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("source").topCard.cardId).toBe("EX9-064");
    expect(s.perm("source").stack).toHaveLength(4);
    expect(
      s
        .perm("source")
        .stack.slice(0, 3)
        .map(({ cardId }) => cardId)
        .sort(),
    ).toEqual(["EX9-008", "EX9-035", "EX9-051"]);
    expect(
      s
        .perm("source")
        .stack.slice(0, 3)
        .every(({ faceUp }) => faceUp === false),
    ).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-046"]);
    // Ending Main voluntarily frames the incoming player at -3, then the printed Ver.4
    // evolution cost moves memory another 3 toward that player.
    expect(s.state.memory).toBe(-6);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits -3000 DP for opposing Security Digimon during your turn", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifySecurityDP", controller: "opponent", amount: -3000, duration: "permanent" }],
    });
  });
  it("applies the inherited Security-Digimon reduction through the live ledger", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-057", as: "host", under: ["EX9-028"] }] },
      1: { security: ["BT1-009", "BT1-090"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it.each([
    { base: "BT1-048", alternate: false, legal: true },
    { base: "EX9-034", alternate: true, legal: true },
    { base: "BT1-009", alternate: true, legal: false },
  ])("checks the evolution route from $base", async ({ base, alternate, legal }) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "host" }],
        hand: [{ card: "EX9-028", as: "evo" }],
        deck: ["BT1-046"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: alternate,
      }).ok,
    ).toBe(legal);
    await settle();
    expect(s.perm("host").topCard.cardId).toBe(legal ? "EX9-028" : base);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(legal ? [base] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? ["BT1-046"] : ["EX9-028"]);
    expect(s.state.memory).toBe(legal ? 3 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves into a Ver.4 card from trash and pays its printed evolution cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-028", as: "source" }],
          trash: ["EX9-008", "EX9-035", "EX9-051", "EX9-064"],
          hand: ["BT1-010"],
          deck: ["BT1-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await fireOnEndTurn(s);
    await settle();

    expect(s.perm("source").topCard.cardId).toBe("EX9-064");
    expect(
      s
        .perm("source")
        .stack.slice(0, 3)
        .map(({ cardId }) => cardId)
        .sort(),
    ).toEqual(["EX9-008", "EX9-035", "EX9-051"]);
    expect(s.perm("source").stack[3]?.cardId).toBe("EX9-028");
    expect(
      s
        .perm("source")
        .stack.slice(0, 3)
        .every(({ faceUp }) => faceUp === false),
    ).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-048"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not pay the three-card cost when the optional end-of-turn evolution is refused", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-028", as: "source" }],
          trash: ["EX9-008", "EX9-035", "EX9-051"],
          hand: ["EX9-064", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await fireOnEndTurn(s);
    await settle();

    expect(s.perm("source").topCard.cardId).toBe("EX9-028");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-008", "EX9-035", "EX9-051"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-064", "BT1-010"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not resolve the same end-of-turn evolution again after it already evolved this turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-028", as: "source" }],
          trash: ["EX9-008", "EX9-035", "EX9-051", "EX9-008", "EX9-035", "EX9-051", "EX9-008"],
          hand: ["EX9-064"],
          deck: ["BT1-010"],
        },
        1: { hand: [{ card: "BT10-066", as: "devolve" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await fireOnEndTurn(s);
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-064");
    // Re-expose the same Nanimon instance without advancing the turn. This prevents
    // loss of its main effect after evolution from masquerading as Once Per Turn.
    await advance(s.engine).verb.playInstances([s.inst("devolve").instanceId]);
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-028");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-035", "EX9-051", "EX9-008", "EX9-064"]);
    const afterFirstStack = s.perm("source").stack.map(({ instanceId }) => instanceId);
    const afterFirstTrash = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    const afterFirstMemory = s.state.memory;

    await fireOnEndTurn(s);
    await settle();

    expect(s.perm("source").topCard.cardId).toBe("EX9-028");
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual(afterFirstStack);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(afterFirstTrash);
    expect(s.state.memory).toBe(afterFirstMemory);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces a security Digimon during the owner's turn, changing a real security battle, then expires", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-057", as: "attacker", under: ["EX9-028"] }] },
        1: { security: ["BT1-019", "BT1-019"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-057"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-019"]);
    await advance(s.engine).runTurn(0);
    // The test seam runs one turn at a time; pass the turn exactly as the production loop does.
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await s.ready();
    expect(observe(s.engine).securityDp(1)).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not partially pay when fewer than three Ver.4 cards are in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-028", as: "source" }],
          trash: ["EX9-008", "EX9-035", "EX9-034"],
          hand: ["EX9-063"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await fireOnEndTurn(s);
    await settle();

    expect(s.perm("source").topCard.cardId).toBe("EX9-028");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-008", "EX9-035", "EX9-034"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-063")).toBe(true);
  });
});
