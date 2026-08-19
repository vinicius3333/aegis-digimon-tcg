import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-099 Gear Forest Village", () => {
  it("takes the top security card and places itself face up in security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-099", as: "village" }],
          security: [{ card: "BT25-001", as: "topSecurity" }, { card: "BT25-002" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const villageId = s.inst("village").instanceId;
    const topSecurityId = s.inst("topSecurity").instanceId;
    type PlayCardIntentWithUseAs = Parameters<typeof s.engine.applyIntent>[1] & { useAs?: "digimon" | "option" };

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: villageId,
      useAs: "option",
    } as PlayCardIntentWithUseAs)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === villageId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === topSecurityId)).toBe(true);
    expect(s.state.players[0]!.security.find((card) => card.instanceId === villageId)).toMatchObject({
      instanceId: villageId,
      faceUp: true,
    });
  });
});
