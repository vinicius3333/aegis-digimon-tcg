import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const KOJI = "BT17-083";
const HOST = "BT1-009";

describe("BT17-083 Koji Minamoto — inherited hand-add trigger", () => {
  it("gains 1 memory when an effect adds a card to its owner's hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: HOST, under: [KOJI], as: "host" }] },
    });
    s.state.memory = 0;
    await s.ready();

    const fireSubTrigger = (s.engine as unknown as {
      fireSubTrigger(event: string, payload?: Record<string, unknown>): Promise<void>;
    }).fireSubTrigger.bind(s.engine);

    await fireSubTrigger("whenEffectAddsToHand", { effectAddedToHandSeat: 0 });

    expect(s.state.memory).toBe(1);
  });
});
