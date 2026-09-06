import { describe, expect, it } from "vitest";
import { type Seat } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-086.js";
import "./BT20-046.js";
import "./BT20-047.js";
import "./index.js";

async function driveTurn(s: ReturnType<typeof setupEngine>, seat: Seat): Promise<void> {
  const turn = s.engine.runOneTurn();
  const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();
  s.engine.applyIntent(seat, { type: "endPhase" });
  await turn;
}

describe("BT20-086 Altea", () => {
  it("sets memory at 3 when it starts your turn at 2 or less", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
  });

  it("places the qualifying black Digimon at the bottom before flipping security", () => {
    const effects = compiled.effects.filter((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effects).toHaveLength(1);
    expect(effects[0]).toMatchObject({
      actions: [
        {
          kind: "SecurityManipulation",
          op: "flipFaceUp",
          optional: true,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            host: {
              filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Cyborg", "Machine"] }] },
            },
          },
        },
      ],
    });
  });

  it("naturally places a qualifying card under a battle-area host and flips the next face-down security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-086", as: "altea" },
            { card: "BT20-047", as: "host" },
          ],
          hand: [{ card: "BT20-046", as: "placed" }],
          deck: ["BT1-010"],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;

    await driveTurn(s, 0);

    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT20-046");
    expect(s.state.players[1]!.security[0]).toMatchObject({ cardId: "BT1-009", faceUp: true });
  });
});
