import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-033.js";
import "../index.js";

describe("BT26-033 compiled fidelity", () => {
  it("encodes keywords, security recovery, leave prevention, and the explicit turn seam", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.keywords?.map((keyword) => keyword.keyword)).toEqual(
      expect.arrayContaining(["Raid", "Alliance", "Engage"]),
    );
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand" },
      {
        kind: "Modal",
        condition: { kind: "isYourTurn" },
        options: [[{ kind: "PlayWithoutCost", reduceCostBy: 5 }], [{ kind: "UseOptionWithoutCost", reduceCostBy: 5 }]],
      },
    ]);
    expect(card?.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          mode: "prevent",
          cost: { kind: "placeAsSecurity", position: "bottom", target: { filter: { isSelfRef: true }, isSelf: true } },
        },
      ],
    });
  });

  it("publicly adds the top security card to hand and plays an Iliad card with the reduction", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-033", as: "jupitermon" }],
        security: [{ card: "BT1-001", as: "securityCard" }],
        hand: [{ card: "BT26-009", as: "iliad" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("jupitermon"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-009");
  });

  it("uses its top stack card as bottom security to prevent a TS card from leaving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-033", as: "jupitermon", under: [{ card: "BT1-009", as: "base" }] },
          { card: "BT26-013", as: "protectedTs" },
        ],
      },
    }, { autoAcceptOptional: true });
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("protectedTs").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-013")).toBe(true);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT26-033");
  });
});
