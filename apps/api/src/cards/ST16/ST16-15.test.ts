import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-15.js";

describe("ST16-15 Lament of Friendship", () => {
  it("grants the On Deletion replay effect to the chosen own Garurumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST16-14", { card: "ST16-08", as: "garurumon" }],
          hand: [{ card: "ST16-15", as: "option" }],
          trash: [{ card: "ST16-02", as: "recover" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => (s.engine as unknown as { continuous: { listCustomEffectGrants(): readonly unknown[] } }).continuous.listCustomEffectGrants().length > 0);

    const engine = s.engine as unknown as {
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };
    expect(engine.continuous.listCustomEffectGrants()).toContainEqual(expect.objectContaining({
      instanceId: s.perm("garurumon").topCard!.instanceId,
      token: "OnDeletionPlaySelf",
    }));
  });
});
