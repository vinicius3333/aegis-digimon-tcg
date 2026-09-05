import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-051.js";

describe("EX7-051", () => {
  it("draws 1 by placing a Three Musketeers Option from hand or trash under a Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      optional: true,
      cost: { kind: "place", destination: "digivolutionStack", position: "bottom" },
    }));
  it("inherits Retaliation", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Retaliation",
      raw: "＜Retaliation＞",
    }));

  it("publicly draws after placing a Three Musketeers Option under a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-051", as: "sparrow" },
            { card: "BT1-009", as: "host" },
          ],
          hand: ["EX7-066"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("sparrow"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.cardId === "EX7-066")),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.cardId === "EX7-066")),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("can place the qualifying Option from trash under a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-051", as: "sparrow" },
            { card: "BT1-009", as: "host" },
          ],
          trash: ["EX7-066"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("sparrow"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.cardId === "EX7-066")),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.cardId === "EX7-066")),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX7-066")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
});
