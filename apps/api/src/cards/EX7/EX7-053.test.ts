import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-053.js";

describe("EX7-053", () => {
  it("trashes a card from hand and may return an Evil, Dark Dragon, or Evil Dragon Digimon from trash", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Trash", target: { count: 1 } },
      { kind: "Return", to: "hand", optional: true, target: { count: 1 } },
    ]));
  it("inherits Retaliation", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Retaliation",
      raw: "＜Retaliation＞",
    }));

  it("publicly trashes a hand card and returns an eligible Dark Dragon Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-053", as: "scatter" },
            { card: "BT1-009", as: "discard" },
          ],
          trash: [{ card: "BT11-079", as: "returnable" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scatter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnable").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnable").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId)).toBe(true);
  });
});
