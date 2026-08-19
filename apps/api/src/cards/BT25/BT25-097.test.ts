import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-097 Guardian Palace", () => {
  it("adds the bottom security card and places itself face up at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-097", as: "palace" }],
          security: [{ card: "BT25-001", as: "bottomSecurity" }, { card: "BT25-002" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const palaceId = s.inst("palace").instanceId;
    const bottomSecurityId = s.inst("bottomSecurity").instanceId;
    type PlayCardIntentWithUseAs = Parameters<typeof s.engine.applyIntent>[1] & { useAs?: "digimon" | "option" };

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: palaceId,
      useAs: "option",
    } as PlayCardIntentWithUseAs)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === palaceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bottomSecurityId)).toBe(true);
    expect(s.state.players[0]!.security.find((card) => card.instanceId === palaceId)).toMatchObject({
      instanceId: palaceId,
      faceUp: true,
    });
  });
});
