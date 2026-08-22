import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT11-073.js";
describe("BT11-073 Justimon: Accel Arm", () => {
  it("returns a level 6 source when its digivolving effect is accepted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT11-073", as: "justimon", under: ["BT2-030"] }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("justimon"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-030")).toBe(true);
  });

  it("digivolves into a Justimon from hand for 2 when attacking with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-073", as: "justimon" },
            { card: "BT1-087", as: "tamer" },
          ],
          hand: [{ card: "BT10-067", as: "evolution" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    await advance(s.engine).fire(EffectTiming.WhenAttacking, s.perm("justimon"));
    await settle(() => s.perm("justimon").topCard.cardId === "BT10-067");

    expect(s.perm("justimon").topCard.cardId).toBe("BT10-067");
    expect(s.state.memory).toBe(0);
  });

  it("does not digivolve from the attack effect without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-073", as: "justimon" }],
          hand: [{ card: "BT10-067", as: "evolution" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    await advance(s.engine).fire(EffectTiming.WhenAttacking, s.perm("justimon"));
    await settle(() => false, 20);

    expect(s.perm("justimon").topCard.cardId).toBe("BT11-073");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-067")).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
