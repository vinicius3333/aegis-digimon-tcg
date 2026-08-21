import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-242.js";

describe("P-242 trash link activation", () => {
  it("suspends Rei and links a qualifying trash card to an owned Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-242", as: "rei" },
            { card: "BT24-038", as: "host" },
          ],
          trash: [{ card: "BT24-038", as: "linkCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const source = s.perm("rei");
    const effect = (observe(s.engine).activatableEffects(source) as Array<{ effectKey: string }>).find((entry) =>
      entry.effectKey.endsWith("main-suspend-link"),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("linkCard").instanceId), 500);
    expect(source.isSuspended).toBe(true);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("linkCard").instanceId);
  });
});
