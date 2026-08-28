import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-001 Gammamon", () => {
  it("draws when an effect places a digivolution card under its host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-005", as: "host", under: [{ card: "RB1-001" }] },
            { card: "RB1-032", as: "hiro" },
          ],
          hand: [{ card: "RB1-005", as: "gammamon" }],
          deck: ["RB1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const drawnInstanceId = s.state.players[0]!.deck[0]!.instanceId;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hiro"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnInstanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnInstanceId)).toBe(true);
  });
});
