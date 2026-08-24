import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-092.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("BT26-092 Shota Kuroi", () => {
  it("compiles the start-main TS cost and draw/memory benefit", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: { kind: "trash" },
          optional: true,
          actions: [
            { kind: "Draw", amount: 1 },
            { kind: "GainMemory", amount: 1 },
          ],
        },
      ],
    });
  });
  it("compiles the opponent-attack TS Tamer cost and TS Digimon redirect", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "RedirectAttack", optional: true, cost: { kind: "return", to: "deckBottom" } }],
        },
      ],
    });
  });
  it("trashes a TS card to draw and then gains memory at main-phase start", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-092", as: "shota" }],
          hand: [{ card: "BT26-008", as: "tsCost" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("shota"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT26-008")).toBe(true);
  });
  it("returns a TS Tamer to redirect an opponent attack into a TS Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-092", as: "shota" },
            { card: "BT26-080", as: "defender" },
          ],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
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
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT26-092");
  });
});
