import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-074.js";
describe("BT1-074 Togemon", () => {
  it("adds a revealed level 5 or higher Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-067", as: "base" }],
          hand: [{ card: "BT1-074", as: "evolving" }],
          deck: [{ card: "BT1-075", as: "eligible" }, "BT1-068", "BT1-069"],
        },
      },
      { autoSelectCards: true },
    );
    const p = s.state.players[0] as PlayerState;
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p.hand.some((c) => c.instanceId === s.inst("eligible").instanceId));
    expect(p.deck).toHaveLength(2);
  });

  it("accepts a level 7 Digimon and excludes a level 4 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-067", as: "base" }],
          hand: [{ card: "BT1-074", as: "evolving" }],
          deck: [
            { card: "BT1-084", as: "levelSeven" },
            { card: "BT1-070", as: "levelFour" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("levelSeven").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("levelFour").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(false);
  });

  it("lets the player order the remaining revealed cards at the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-067", as: "base" }],
          hand: [{ card: "BT1-074", as: "evolving" }],
          deck: [
            { card: "BT1-075", as: "eligible" },
            { card: "BT1-068", as: "first" },
            { card: "BT1-069", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const decision = s.decisions.at(-1)!.req;
    const order = [s.inst("second").instanceId, s.inst("first").instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.instanceId).join(",") === order.join(","),
    );

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(order);
  });
});
