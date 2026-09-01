import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-062.js";

describe("BT11-062 Agumon (X Antibody)", () => {
  it("maps its catalog facts, dual trigger, and inherited protection to IR", () => {
    expect(getCardDefinition("BT11-062")).toMatchObject({
      cardId: "BT11-062",
      colors: ["Black"],
      level: 3,
      playCost: 4,
      dp: 3000,
      types: ["Reptile", "X Antibody"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3 }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "RevealAdd", revealCount: 3 }] },
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "Replacement", event: "wouldLeavePlay" }] },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Agumon"], cost: 0, isAlternate: true }]);
  });

  it("reveals 3 and independently adds a Greymon/X Antibody card and a black Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-062", as: "agumon" }],
          deck: ["BT11-064", "BT10-092", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT11-064", "BT10-092"]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });

  it("uses the same mandatory two-category reveal when digivolving for 0 from Agumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "agumon" }],
          hand: [{ card: "BT11-062", as: "xAgumon" }],
          deck: ["BT9-109", "BT10-092", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("xAgumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT9-109", "BT10-092"]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });

  it("prevents an effect bounce by bottom-decking X Antibody from its Greymon host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-064", as: "greymon", under: ["BT11-062", "BT9-109"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.returnToHand([s.perm("greymon").topCard.instanceId]);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT9-109");
    expect(s.perm("greymon").stack.map(({ cardId }) => cardId)).not.toContain("BT9-109");
  });

  it("does not protect a host without Greymon or Omnimon in its name", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-075", as: "host", under: ["BT11-062", "BT9-109"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.returnToHand([s.perm("host").topCard.instanceId]);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-075");
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
