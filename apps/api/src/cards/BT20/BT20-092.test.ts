import { describe, expect, it } from "vitest";
import { type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-092.js";
import "./index.js";

async function driveTurn(s: ReturnType<typeof setupEngine>, seat: Seat): Promise<void> {
  const turn = s.engine.runOneTurn();
  const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();
  s.engine.applyIntent(seat, { type: "endPhase" });
  await turn;
}

describe("BT20-092 Battle NPC", () => {
  it("places a level 3 Digimon under itself before drawing", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 1,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            underFilter: { isSelfRef: true },
            target: { from: ["hand"], filter: { zone: "hand", kind: ["Digimon"], levels: [3] } },
          },
          abortOnDecline: true,
        },
      ],
    });
  });

  it("requires having no Digimon before offering the under-Tamer play", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      condition: { kind: "youHaveNone", filter: { kind: ["Digimon"] } },
      actions: [
        { kind: "PlayWithoutCost", from: ["underThisTamer"], payCost: false, abortOnDecline: true },
        { kind: "Delete", target: { isSelf: true } },
      ],
    });
  });

  it("naturally places a level 3 Digimon under itself and draws one card on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-092", as: "npc" },
            { card: "BT20-046", as: "under" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("npc").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("npc").stack.some((card) => card.cardId === "BT20-046"));

    expect(s.perm("npc").stack.map((card) => card.cardId)).toContain("BT20-046");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-010");
  });

  it("at the next main phase plays its under-Tamer Digimon and then deletes itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-092", as: "npc", under: ["BT20-046"] }],
          deck: ["BT1-010"],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;

    await driveTurn(s, 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-092")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-046")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-092")).toBe(true);
  });

  it("sets memory to exactly 3 at start of turn when the gauge is at 2", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT20-092", as: "npc" }], deck: ["BT1-010"] }, 1: { deck: ["BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 2;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
