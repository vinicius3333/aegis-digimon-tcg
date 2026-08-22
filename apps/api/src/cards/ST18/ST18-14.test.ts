import { describe, expect, it } from "vitest";
import { compiled } from "./ST18-14.js";
import { EffectTiming } from "@aegis/shared";
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
                expect.objectContaining({ kind: "RedirectAttack", includePlayer: true, cost: { kind: "suspend" } }),
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
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("shoto"));
    expect(s.state.memory).toBe(3);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ condition: { value: 2 }, value: 3 }],
    });
  });

  it("plays itself from Security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST18-14", as: "shoto", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("shoto"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-14"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-14")).toBe(true);
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });
});
