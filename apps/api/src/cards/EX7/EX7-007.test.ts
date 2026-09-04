import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-007.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-007 Vorvomon", () => {
  it("reveals three for Dragon traits and Hina", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("inherits permanent +2000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));

  it("adds one matching Dragon and Hina from the top three, returning the rest to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT2-011", "EX3-065", "BT1-009"],
          battleArea: [{ card: "EX7-007", as: "vorvomon" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("vorvomon"));
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "BT2-011") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX3-065"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT2-011", "EX3-065"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("applies the inherited +2000 DP during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-007"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
