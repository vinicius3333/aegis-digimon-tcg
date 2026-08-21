import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-061.js";

describe("BT18-061 Trailmon", () => {
  it("reveals three and places a qualifying black level-four card under itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-061", as: "trailmon" }],
          deck: ["BT11-040", "BT1-010", "BT18-088"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trailmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.cardId === "BT11-040")));

    const trailmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-061")!;
    expect(trailmon.stack.some((card) => card.cardId === "BT11-040")).toBe(true);
    expect(trailmon.stack).toHaveLength(1);
  });
});
