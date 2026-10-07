import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-03 Kyubimon", () => {
  it("GitHub #5196: displays the official search timings", () => {
    const text = getCardDefinition("ST22-03")!.effectText;
    expect(text).toContain("[When Moving] [When Digivolving]");
    expect(text).not.toContain("[On Play]");
  });
  it("GitHub #5196: does not search when played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST22-03", as: "kyubimon" }],
          deck: [{ card: "ST22-02", as: "eligible" }, "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kyubimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("eligible").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("GitHub #5196: searches when digivolving through a public intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-02", as: "renamon" }],
          hand: [{ card: "ST22-03", as: "kyubimon" }],
          deck: ["BT1-009", { card: "ST22-02", as: "eligible" }, "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("renamon").permanentId,
        instanceId: s.inst("kyubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("eligible").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(
      s.events.some(
        (e) => e.kind === "effectResolved" && e.sourceCardId === "ST22-03" && e.timing === "WhenDigivolving",
      ),
    ).toBe(true);
  });
});
