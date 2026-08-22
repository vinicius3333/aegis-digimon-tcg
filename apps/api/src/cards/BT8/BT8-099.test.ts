import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-099.js";

describe("BT8-099 Giga Death", () => {
  it("suspends one opposing Digimon, then returns up to ten suspended Digimon", async () => {
    const opponents = Array.from({ length: 11 }, (_, index) => ({
      card: "BT8-023",
      as: `target${index}`,
    }));
    const s = setupEngine({
      0: { battleArea: ["BT8-021"], hand: [{ card: "BT8-099", as: "option" }] },
      1: { battleArea: opponents },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.deck.length).toBeGreaterThanOrEqual(10);
  });

  it("can include an already suspended opposing Digimon in the second effect", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT8-021"], hand: [{ card: "BT8-099", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT8-023", as: "alreadySuspended", suspended: true },
          { card: "BT8-023", as: "newTarget" },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
