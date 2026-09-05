import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-040.js";

describe("EX7-040", () => {
  it("draws 2 by optionally trashing a Three Musketeers card from hand", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash" },
    }));
  it("inherits Reboot", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Reboot",
      raw: "＜Reboot＞",
    }));

  it("trashes a Three Musketeers card and draws two through On Play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-040", as: "toy" }],
          hand: [{ card: "BT6-112", as: "musketeer" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("toy"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT6-112")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT1-002"]));
  });

  it("does not draw when the optional On Play cost is declined", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX7-040", as: "toy" }], hand: ["BT6-112"], deck: ["BT1-001", "BT1-002"] } },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("toy"));
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
  });
});
