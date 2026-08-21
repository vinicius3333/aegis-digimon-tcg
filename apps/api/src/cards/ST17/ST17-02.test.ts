import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-02 Terriermon", () => {
  it("plays a green Tamer from hand with its play cost reduced by 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST17-02", as: "terriermon" }],
        hand: [{ card: "ST17-10", as: "henry" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    await s.ready();
    const effects = JSON.parse(s.perm("terriermon").activatableEffectsJson) as Array<{ effectKey: string; timing: string }>;
    const key = effects[0]!.effectKey;
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("terriermon").topCard.instanceId,
      effectKey: key,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-10"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-10")).toBe(true);
    expect(s.state.memory).toBe(9);
  });

  it("gives its suspended host +1000 DP through the inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-03", as: "host", suspended: true, under: ["ST17-02"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(2000);
  });
});
