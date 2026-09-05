import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-045.js";

describe("EX7-045", () => {
  it("de-digivolves an opposing Digimon by 1 to level 3 on play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      stopAtLevel: 3,
    }));
  it("gives all your NSp Digimon Blocker during the opponent's turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { count: "all" },
      duration: "permanent",
    }));

  it("publicly de-digivolves an opposing stack and grants Blocker only to NSp Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-045", as: "jaga" }] },
        1: { battleArea: [{ card: "EX7-014", as: "target", under: ["EX7-011"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jaga"));
    expect(s.perm("target").stack).toHaveLength(0);

    const blocker = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-045", as: "jaga" },
          { card: "EX7-038", as: "nsp" },
          { card: "EX7-011", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    blocker.state.turnSeat = 1;
    await blocker.ready();
    await advance(blocker.engine).recompute();
    const blockerObservation = observe(blocker.engine);
    expect(blockerObservation.hasKeyword(blocker.perm("nsp"), "Blocker")).toBe(true);
    expect(blockerObservation.hasKeyword(blocker.perm("other"), "Blocker")).toBe(false);
  });
});
