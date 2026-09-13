import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-105.js";

describe("BT13-105 Full Moon Meteor Impact", () => {
  it("returns one opposing Digimon, then gains one memory per four cards in the opponent's hand", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(actions[1]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      scaling: { per: 4, unit: "cards", filter: { zone: "hand", controller: "opponent" } },
    });
  });

  it("returns one opposing Digimon from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  it.each([
    { initialHand: 2, finalHand: 3, memory: 2 },
    { initialHand: 3, finalHand: 4, memory: 3 },
    { initialHand: 6, finalHand: 7, memory: 3 },
    { initialHand: 7, finalHand: 8, memory: 4 },
  ])(
    "returns the selected opposing Digimon and scales from $initialHand to $finalHand cards",
    async ({ initialHand, finalHand, memory }) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT1-030", as: "blueDigimon" }], hand: [{ card: "BT13-105", as: "option" }] },
          1: {
            battleArea: [{ card: "BT13-111", as: "target" }],
            hand: Array.from({ length: initialHand }, () => "BT1-009"),
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 10;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.hand.filter((card) => card.cardId === "BT13-111").length === 1);

      expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT13-111")).toBe(false);
      expect(s.state.players[1]!.hand.filter((card) => card.cardId === "BT13-111").length).toBe(1);
      expect(s.state.players[1]!.hand).toHaveLength(finalHand);
      expect(s.state.memory).toBe(memory);
    },
  );

  it("returns an opposing Digimon without the Main memory gain from security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "blueDigimon" }],
          security: [{ card: "BT13-105", as: "securityOption" }],
          deck: ["BT1-009"],
        },
        1: {
          deck: ["BT1-009", "BT1-009"],
          hand: ["BT1-009"],
          battleArea: [
            { card: "BT1-015", as: "attacker" },
            { card: "BT13-111", as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId, s.perm("target").topCard.instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT13-111"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
