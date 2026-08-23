import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./RB1-034.js";
import "../index.js";

describe("RB1-034 Ruli Tsukiyono", () => {
  it("suspends to reduce a qualifying green Beast digivolution cost by exactly 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-034", as: "ruli" },
            { card: "RB1-022", as: "base" },
          ],
          hand: [{ card: "RB1-024", as: "lamortmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lamortmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "RB1-024");

    expect(s.state.memory).toBe(1);
    expect(s.perm("ruli").isSuspended).toBe(true);
  });

  it("excludes Sea Animal from the Beast, Animal, or Sovereign reduction filter", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "CostModifier",
      into: { excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }] },
    });
  });

  it("unsuspends one suspended Digimon with Angoramon in its name at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-034", as: "ruli" },
            { card: "RB1-022", as: "angoramon", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("ruli"));

    expect(s.perm("angoramon").isSuspended).toBe(false);
  });
});
