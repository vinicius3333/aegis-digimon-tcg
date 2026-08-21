import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-032 Hiro Amanokawa", () => {
  it("places the exact Gammamon from hand under a Digimon, gains memory, and draws", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-005", as: "host" },
            { card: "RB1-032", as: "hiro" },
          ],
          hand: [{ card: "RB1-005", as: "gammamon" }],
          deck: ["RB1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("host").topCard.instanceId);
    const gammamonInstanceId = s.inst("gammamon").instanceId;
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hiro"));
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === gammamonInstanceId));

    expect(s.perm("host").stack.some((card) => card.instanceId === gammamonInstanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === gammamonInstanceId)).toBe(false);
  });
});
