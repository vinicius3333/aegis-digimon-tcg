import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-112.js";

describe("P-112 Morphomon", () => {
  it("uses its inherited effect when another Eosmon is played to digivolve from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host", under: ["P-112"] }],
          hand: [
            { card: "BT6-083", as: "triggerEosmon" },
            { card: "BT6-083", as: "eosmonEvolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("triggerEosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("eosmonEvolution").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("eosmonEvolution").instanceId);
    expect(s.perm("host").stack.some((card) => card.cardId === "P-112")).toBe(true);
    assertNoLoudGap(s);
  });

  it("may place itself under an Eosmon and play the revealed Menoa Bellucci", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-083", as: "eosmon" }],
          hand: [{ card: "P-112", as: "morphomon" }],
          deck: [{ card: "BT6-092", as: "menoa" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("morphomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT6-092"));
    const eosmon = s.perm("eosmon");
    expect(eosmon.stack.some((card) => card.instanceId === s.inst("morphomon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("menoa").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

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
