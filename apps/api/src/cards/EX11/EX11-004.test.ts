import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-004.js";
import "../index.js";

describe("EX11-004 Kapurimon", () => {
  it("draws when a face-up card is added to the opponent's security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "host", under: ["EX11-004", "BT18-004"] }],
          hand: [{ card: "BT18-044", as: "royal" }],
          security: [{ card: "BT1-001", as: "oldSecurity" }],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-002"]),
    );
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: "BT18-044", faceUp: true });
  });
});
