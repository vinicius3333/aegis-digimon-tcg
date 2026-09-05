import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-008.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-008 ToyAgumon", () => {
  it("reveals three for Three Musketeers and a cost-6 Option", () =>
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

  it("adds a Three Musketeers card and a cost-6 Option from the top three", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["EX7-071", "EX7-070", "BT1-009"],
          battleArea: [{ card: "EX7-008", as: "toyAgumon" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("toyAgumon"));
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "EX7-071") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX7-070"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX7-071", "EX7-070"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("leaves an Option below the cost-6 boundary in the revealed remainder", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["EX7-059", "EX7-070", "EX7-069"],
          battleArea: [{ card: "EX7-008", as: "toyAgumon" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("toyAgumon"));
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX7-059", "EX7-070"]));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("EX7-069");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX7-069"]);
  });

  it("applies the inherited +2000 DP during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-008"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
