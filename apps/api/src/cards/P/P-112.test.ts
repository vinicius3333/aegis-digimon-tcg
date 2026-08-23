import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-112.js";

describe("P-112 Morphomon", () => {
  it("reveals three and adds both Eosmon and Menoa Bellucci when both are present", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-112", as: "morphomon" }],
          deck: [
            { card: "BT6-083", as: "eosmon" },
            { card: "BT6-092", as: "menoa" },
            { card: "BT1-009", as: "filler" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("morphomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eosmon").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("menoa").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eosmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("menoa").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("filler").instanceId);
    assertNoLoudGap(s);
  });

  it("adds the one matching card when only one of Eosmon or Menoa is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-112", as: "morphomon" }],
          deck: [{ card: "BT6-083", as: "eosmon" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoOrderCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("morphomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eosmon").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eosmon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
