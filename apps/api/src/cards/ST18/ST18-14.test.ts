import { describe, expect, it } from "vitest";
import { compiled } from "./ST18-14.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST18-14 Shoto Kazama", () => {
  it("declares memory setting, paid redirect to Digimon/player, and Security play", () => {
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourTurn",
          actions: [expect.objectContaining({ kind: "SetMemory" })],
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            expect.objectContaining({
              actions: [
                expect.objectContaining({
                  kind: "RedirectAttack",
                  includePlayer: true,
                  cost: expect.objectContaining({ kind: "suspend" }),
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({ trigger: "Security", isSecurity: true }),
      ]),
    );
  });

  it("sets memory to three at the start of turn when memory is two", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST18-14", as: "shoto" }] } });
    s.state.memory = 2;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ condition: { value: 2 }, value: 3 }],
    });
  });

  it("plays itself from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST18-14", as: "shoto" }, "BT1-090"] },
      1: { battleArea: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.state.players[1]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-14"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-14")).toBe(true);
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });
});
