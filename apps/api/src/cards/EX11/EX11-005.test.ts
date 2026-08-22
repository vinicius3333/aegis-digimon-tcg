import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-005.js";
import "../index.js";

describe("EX11-005 Yaamon", () => {
  it("digivolves from trash and then trashes two hand cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX11-005"] }],
          hand: ["BT1-001", "BT1-002", "BT1-003"],
          trash: [{ card: "EX11-049", as: "evolution" }],
          deck: ["BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-049"));
    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX11-049");
    expect(host?.topCard?.cardId).toBe("EX11-049");
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.trash.length).toBeGreaterThanOrEqual(2);
  });
});
