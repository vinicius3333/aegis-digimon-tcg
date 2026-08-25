import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-006.js";

describe("BT11-006 Tsunomon", () => {
  it("matches the catalog and carries the complete inherited contract", () => {
    expect(getCardDefinition("BT11-006")).toMatchObject({
      cardId: "BT11-006",
      nameEn: "Tsunomon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When an effect trashes a card in your hand, this Digimon gets +1000 DP for the turn.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenTrashedFromHand",
              actions: [
                {
                  kind: "ModifyDP",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                  amount: 1000,
                  duration: "forTheTurn",
                },
              ],
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gives its host +1000 DP when an opponent's effect trashes its controller's card (Q2047)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT11-006"] }],
        hand: [{ card: "BT1-010", as: "discard" }],
      },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 1);
    await settle(() => s.perm("host").currentDP === before + 1000);

    expect(s.perm("host").currentDP).toBe(before + 1000);
  });

  it("applies the boost only once across two effect-trash events in the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT11-006"] }],
        hand: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).verb.trash([s.inst("first").instanceId]);
    await settle(() => s.perm("host").currentDP === before + 1000);
    await advance(s.engine).verb.trash([s.inst("second").instanceId]);

    expect(s.perm("host").currentDP).toBe(before + 1000);
  });

  it("does not trigger outside its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT11-006"] }],
        hand: [{ card: "BT1-010", as: "discard" }],
      },
    });
    const before = s.perm("host").currentDP;
    s.state.turnSeat = 1;

    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 1);

    expect(s.perm("host").currentDP).toBe(before);
  });
});
