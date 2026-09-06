import { describe, expect, it } from "vitest";
import { type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
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

  it.each([2, 3, 4] as const)("handles the natural Start of Your Turn memory boundary at %s", async (memory) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-086", as: "altea" }], hand: ["BT1-010"], deck: ["BT1-010", "BT1-010"] },
      1: { deck: ["BT1-010", "BT1-010"] },
    });
    s.state.memory = memory;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(memory <= 2 ? 3 : memory);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it.each([
    ["hand", true, true],
    ["hand", false, true],
    ["hand", true, false],
    ["trash", true, true],
    ["trash", false, true],
    ["trash", true, false],
  ] as const)("pays placement from %s only when accepted (%s) and eligible (%s)", async (zone, accept, eligible) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-086", as: "altea" },
            { card: "BT20-047", as: "host" },
          ],
          [zone]: [{ card: eligible ? "BT20-046" : "BT20-010", as: "candidate" }],
          deck: ["BT20-010", "BT20-010"],
        },
        1: { security: [{ card: "BT1-009", as: "security" }, { card: "BT1-010" }] },
      },
      { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
    );
    const candidateId = s.inst("candidate").instanceId;
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await driveTurn(s, 0);
    const paid = accept && eligible;
    expect(s.state.players[1]!.security[0]!.faceUp).toBe(paid);
    expect(s.perm("host").stack.some((card) => card.instanceId === candidateId)).toBe(paid);
    expect(s.state.players[0]![zone].some((card) => card.instanceId === candidateId)).toBe(!paid);
  });
});
