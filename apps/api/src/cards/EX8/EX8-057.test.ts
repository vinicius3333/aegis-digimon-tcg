import { describe, expect, it } from "vitest";
import { EffectTiming, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-057.js";

describe("EX8-057", () => {
  it("reveals 3 for an NSo and Fallen Angel card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("contains the printed on-play and inherited effects", () => expect(compiled.effects).toHaveLength(2));
  it("inherits a once-per-turn draw then trash effect when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash", target: { count: 1 } }],
    }));
  it("adds one NSo and one Fallen Angel from the revealed top three", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX8-057", as: "source" }], deck: ["BT1-001", "BT11-080", "BT26-062"] } },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => player.hand.some((card) => card.cardId === "BT26-062") && player.hand.some((card) => card.cardId === "BT11-080"));
    expect(player.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT26-062", "BT11-080"]));
  });
});
