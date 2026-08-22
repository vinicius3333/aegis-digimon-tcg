import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-034.js";

describe("BT13-034 Kudamon", () => {
  it("reveals three cards, adds the two yellow categories, and bottoms the rest", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            {
              count: 1,
              to: "hand",
              filter: { kind: ["Digimon"], colors: ["Yellow"], nameOrTrait: [{ match: "trait", tokens: ["Vaccine"] }] },
            },
            { count: 1, to: "hand", filter: { kind: ["Tamer"], colors: ["Yellow"] } },
          ],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: { kind: "raw", raw: expect.stringContaining("6 or fewer") },
        },
      ],
    });
  });

  it("adds a yellow Vaccine and Tamer from the top three cards and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-034", as: "kudamon" }], deck: ["BT13-036", "BT13-098", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("kudamon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT13-036"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT13-036", "BT13-098"]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });
});
