import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-013.js";

describe("BT11-013 Garudamon", () => {
  it("has Blocker and plays an eligible red Tamer from hand on its host's deletion", async () => {
    const top = setupEngine({ 0: { battleArea: [{ card: "BT11-013", as: "garudamon" }] } });
    await top.ready();
    expect(observe(top.engine).hasKeyword(top.perm("garudamon"), "Blocker")).toBe(true);

    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-013"] }],
        hand: [{ card: "BT1-085", as: "tai" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some(
      ({ topCard }) => topCard?.cardId === "BT1-085",
    ));

    expect(s.state.players[0]!.battleArea.some(
      ({ topCard }) => topCard?.cardId === "BT1-085",
    )).toBe(true);
  });
});
