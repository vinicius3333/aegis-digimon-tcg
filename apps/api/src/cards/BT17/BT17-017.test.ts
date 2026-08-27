import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-017.js";

describe("BT17-017", () => {
  it("models Security Attack +1 and deletes an opposing Digimon at or below this card's DP", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", relativeToSource: true } } } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete" }] });
  });

  it("returns a Tamer and Hybrid Digimon from trash, then plays a Tamer", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        { kind: "Return", to: "hand", target: { filter: { kind: ["Tamer"] } } },
        { kind: "Return", to: "hand", target: { filter: { kind: ["Digimon"] } } },
        { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true },
      ],
    });
  });

  it("returns the required Tamer and Hybrid cards after deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-017", as: "ancient" }],
          trash: [
            { card: "BT17-081", as: "tamer" },
            { card: "BT17-011", as: "hybrid" },
          ],
          hand: [{ card: "BT17-083", as: "playable" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT17-011"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-011")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-081")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-083")).toBe(true);
  });
});
