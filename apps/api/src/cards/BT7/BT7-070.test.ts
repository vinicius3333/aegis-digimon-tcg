import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-070.js";

describe("BT7-070 Wendigomon", () => {
  it("records optional reveal-five processing that trashes only revealed Tamers", () => {
    expect(runtimeCompiledCard("BT7-070")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 5,
              add: [],
              trashFilter: { kind: ["Tamer"] },
              rest: "deckBottom",
              optional: true,
            },
          ],
        },
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            { kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
          ],
        },
      ],
    });
  });

  it("trashes every revealed Tamer and puts the other revealed cards on the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-071", as: "base" }],
          hand: [{ card: "BT7-070", as: "evolving" }],
          deck: [
            "BT1-009",
            { card: "BT1-085", as: "tamerOne" },
            { card: "BT1-086", as: "tamerTwo" },
            { card: "BT1-010", as: "digimonTwo" },
            { card: "BT1-011", as: "digimonThree" },
            "BT1-012",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mine = s.state.players[0] as PlayerState;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => mine.trash.length === 2);
    expect(mine.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("tamerOne").instanceId, s.inst("tamerTwo").instanceId]),
    );
    expect(mine.deck).toHaveLength(3);
  });
});

describe("BT7-070 Wendigomon — KB Q&A rulings", () => {
  const digivolveIntoWendigomon = async (options: { autoAcceptOptional?: boolean; autoDeclineOptional?: boolean }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-071", as: "base" }],
          hand: [{ card: "BT7-070", as: "evolving" }],
          deck: [
            { card: "BT1-009", as: "drawnForDigivolving" },
            { card: "BT1-085", as: "revealedTamerOne" },
            "BT1-010",
            { card: "BT1-086", as: "revealedTamerTwo" },
            "BT1-011",
            "BT1-012",
            { card: "BT1-085", as: "unrevealedTamer" },
          ],
        },
      },
      options,
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea[0]?.topCard.cardId === "BT7-070" &&
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnForDigivolving").instanceId),
    );
    return s;
  };

  it("may decline the [When Digivolving] reveal and leave the deck untouched (Q1624)", async () => {
    const declined = await digivolveIntoWendigomon({ autoDeclineOptional: true });
    const deckBeforeReveal = ["BT1-085", "BT1-010", "BT1-086", "BT1-011", "BT1-012", "BT1-085"];

    expect(declined.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(declined.state.players[0]!.deck.map((card) => card.cardId)).toEqual(deckBeforeReveal);
    expect(declined.state.players[0]!.trash).toHaveLength(0);

    const accepted = await digivolveIntoWendigomon({ autoAcceptOptional: true });
    expect(accepted.state.players[0]!.trash).toHaveLength(2);
  });

  it("must trash every revealed Tamer without choosing which ones to keep (Q1625)", async () => {
    const s = await digivolveIntoWendigomon({ autoAcceptOptional: true });
    const mine = s.state.players[0] as PlayerState;

    expect(mine.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("revealedTamerOne").instanceId, s.inst("revealedTamerTwo").instanceId].sort(),
    );
    expect(s.decisions.some(({ req }) => req.kind === "selectCards" || req.kind === "chooseTargets")).toBe(false);
    expect(mine.deck.map((card) => card.instanceId)).toContain(s.inst("unrevealedTamer").instanceId);
    expect(mine.deck).toHaveLength(4);
  });
});
