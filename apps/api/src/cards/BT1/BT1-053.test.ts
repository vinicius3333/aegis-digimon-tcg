import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-053.js";
import "./BT1-056.js";

describe("BT1-053 Darcmon", () => {
  it("draws 1 when its suspended copy sees a level 3 yellow Digimon played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-053", as: "darcmon", suspended: true }],
        hand: [{ card: "BT1-045", as: "played" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("does not draw while Darcmon is unsuspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-053", as: "darcmon" }],
        hand: [{ card: "BT1-045", as: "played" }],
        deck: [{ card: "BT1-010", as: "mustStayInDeck" }],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("mustStayInDeck").instanceId);
  });

  it.each([
    { label: "yellow level 4", card: "BT1-053" },
    { label: "green level 3", card: "BT1-068" },
  ])("does not draw for a played $label", async ({ card }) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-053", as: "darcmon", suspended: true }],
        hand: [{ card, as: "played" }],
        deck: [{ card: "BT1-010", as: "mustStayInDeck" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.deck.map((candidate) => candidate.instanceId)).toContain(
      s.inst("mustStayInDeck").instanceId,
    );
  });

  it("each suspended Darcmon draws once from the same yellow level-3 play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-053", suspended: true },
            { card: "BT1-053", suspended: true },
          ],
          hand: [{ card: "BT1-045", as: "played" }],
          deck: [
            { card: "BT1-010", as: "drawn1" },
            { card: "BT1-011", as: "drawn2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawn1").instanceId, s.inst("drawn2").instanceId]),
    );
  });

  it("does not treat moving a yellow level-3 from breeding as playing it (Q912)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-053", as: "darcmon", suspended: true }],
        breeding: { card: "BT1-045", as: "mover" },
        deck: [{ card: "BT1-010", as: "mustStayInDeck" }],
      },
    });
    s.state.phase = Phase.Breeding;

    expect(
      s.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: s.perm("mover").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("mustStayInDeck").instanceId);
  });

  it("draws when a yellow level-3 Digimon is played by an effect (Q911)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-053", as: "darcmon", suspended: true }],
          hand: [{ card: "BT1-056", as: "petermon" }],
          trash: [{ card: "BT1-047", as: "tinkermon" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("tinkermon").instanceId,
        ) && s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });
});
