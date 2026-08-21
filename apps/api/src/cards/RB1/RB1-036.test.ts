import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-036 Proximamon", () => {
  it("places the exact Gammamon-text card and deletes an opposing Digimon within its DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-036", as: "proximamon" }], hand: [{ card: "RB1-005", as: "gammamon" }] },
        1: { battleArea: [{ card: "RB1-005", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    const gammamonInstanceId = s.inst("gammamon").instanceId;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("proximamon"));
    await settle(() => s.perm("proximamon").stack.some((card) => card.instanceId === gammamonInstanceId));

    expect(s.perm("proximamon").stack.some((card) => card.instanceId === gammamonInstanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === gammamonInstanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
