import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-019.js";

describe("BT15-019", () => {
  it("trashes one opposing digivolution card and draws if the opponent has none remaining", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 1,
      fromTop: false,
      target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: { kind: "opponentHasNone" },
    });
  });

  it("trashes the bottom source and draws when that leaves no opposing evolution sources", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-019", as: "crabmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "target",
              under: [{ card: "BT15-001", as: "bottom" }],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const bottomId = s.inst("bottom").instanceId;

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crabmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(bottomId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("does not draw while another opposing Digimon still has an evolution source", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-019", as: "crabmon" }],
          deck: [{ card: "BT1-001", as: "deckCard" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "selected", under: ["BT15-001"] },
            { card: "BT1-009", as: "remaining", under: ["BT15-002"] },
          ],
        },
      },
      { autoSelectCards: true },
    );

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crabmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("selected").stack.length === 0);

    expect(s.perm("remaining").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws when the opponent has no Digimon, as clarified by Q2504", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-019", as: "crabmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crabmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("reaches Crabmon through its legal blue level-2 evolution route", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "base" },
        hand: [{ card: "BT15-019", as: "crabmon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("crabmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT15-019");

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack).toHaveLength(1);
  });
});
