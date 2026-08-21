import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-036.js";

describe("BT18-036 Wizardmon", () => {
  it("trashes the exact top security card, draws, and gains 1 memory when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-036", as: "wizardmon" }],
          security: ["BT1-001"],
          deck: ["BT1-002"],
          hand: ["BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const initialMemory = s.state.memory;

    await advance(s.engine).fireForInstance(EffectTiming.WhenDigivolving, s.perm("wizardmon").topCard!);
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002")).toBe(true);
    expect(s.state.memory).toBe(initialMemory + 1);
  });
});
