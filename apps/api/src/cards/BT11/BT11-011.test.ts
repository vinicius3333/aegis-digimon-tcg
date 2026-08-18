import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-011.js";

describe("BT11-011 Birdramon", () => {
  it("has Blocker while it is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-011", as: "birdramon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("birdramon"), "Blocker")).toBe(true);
  });

  it("plays a red Tamer costing 4 or less from hand when its host is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-011"] }],
        hand: [{ card: "BT1-085", as: "tai" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some(
      ({ topCard }) => topCard?.instanceId === s.inst("tai").instanceId,
    ));

    expect(s.state.players[0]!.battleArea.some(
      ({ topCard }) => topCard?.cardId === "BT1-085",
    )).toBe(true);
  });
});
