import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-03 Lopmon", () => {
  it("gives one of your Digimon Alliance for the turn from its Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-03", as: "lopmon" },
            { card: "AD1-001", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effects = JSON.parse(s.perm("lopmon").activatableEffectsJson) as Array<{ effectKey: string }>;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lopmon").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("lopmon").permanentId, "Alliance"));

    expect(observe(s.engine).hasKeyword(s.perm("lopmon").permanentId, "Alliance")).toBe(true);
  });

  it("applies its inherited +1000 DP bonus to a suspended host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-03", as: "host", suspended: true, under: ["ST17-02"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(2000);
  });
});
