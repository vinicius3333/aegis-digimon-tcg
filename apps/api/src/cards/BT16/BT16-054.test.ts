import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-054.js";
import "../index.js";

describe("BT16-054", () => {
  it("can return three D-Brigade or DigiPolice cards from trash to gain Rush", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Rush" },
        duration: "forTheTurn",
        optional: true,
        abortOnDecline: true,
        cost: { kind: "return", target: { count: 3 } },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Restrict",
        restriction: "cantBeBlocked",
        duration: "forTheTurn",
      });
    }
  });

  it("gives other D-Brigade or DigiPolice Digimon inherited DP", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { count: "all" } }],
    });
  });

  it("returns three trait cards to gain Rush and become unblockable live", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-054", as: "seals" }],
          trash: [
            { card: "BT16-050", as: "one" },
            { card: "BT16-050", as: "two" },
            { card: "BT16-050", as: "three" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("seals").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("seals"), "Rush"));

    expect(observe(s.engine).hasKeyword(s.perm("seals"), "Rush")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("seals"), "cantBeBlocked")).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
