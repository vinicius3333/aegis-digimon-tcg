import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-094 Cosmic Area", () => {
  it("places itself face up at the bottom security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-094", as: "area" }],
          security: [{ card: "BT25-001" }, { card: "BT25-002" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const areaId = s.inst("area").instanceId;
    type PlayCardIntentWithUseAs = Parameters<typeof s.engine.applyIntent>[1] & { useAs?: "digimon" | "option" };

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: areaId,
      useAs: "option",
    } as PlayCardIntentWithUseAs)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === areaId));

    expect(s.state.players[0]!.security.find((card) => card.instanceId === areaId)).toMatchObject({
      instanceId: areaId,
      faceUp: true,
    });
  });
});
