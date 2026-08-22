import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-005.js";
import "../index.js";

describe("BT26-005 Pinamon", () => {
  it("compiles the inherited deletion play with the exact face-down Tamer cost", () => {
    const action = compiled.effects[0]!.actions[0]!;
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
    expect(action).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true });
    expect(action.cost).toMatchObject({ kind: "trash", target: { filter: { zone: "digivolutionCards", faceDown: true, position: "bottom" } } });
  });

  it("trashes the bottom face-down Tamer card and plays the eligible Avian card from trash", async () => {
    const s = setupEngine({
      0: { battleArea: [
        { card: "BT1-009", as: "host", under: [{ card: "BT26-005", as: "pinamon" }] },
        { card: "BT26-091", as: "tamer", under: [{ card: "BT26-039", as: "cost", faceUp: false }] },
      ], trash: [{ card: "BT26-072", as: "avian" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] });
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("tamer").stack.length === 0);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT26-072")).toBe(true);
  });
});
