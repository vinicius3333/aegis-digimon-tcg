import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-020.js";

describe("BT17-020", () => {
  it("reveals three and adds a Hybrid/Ten Warriors or inherited-effect Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand" },
            { count: 1, to: "hand" },
          ],
        },
      ],
    });
  });

  it("plays an inherited-effect Tamer from hand for 2 less as inherited once per turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 2, optional: true }],
    });
  });

  it("adds a Hybrid and an eligible Tamer from the top three", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT17-020", as: "strabimon" }], deck: ["BT17-023", "BT17-083", "BT1-009"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("strabimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT17-023"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-023", "BT17-083"]),
    );
  });

  it("plays an inherited-effect Tamer for 2 less when its inherited host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT17-020"] }],
          hand: [{ card: "BT17-083", as: "koji" }],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-083"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("koji").instanceId)).toBe(false);
  });

  it("does not treat a Security-only Tamer as an inherited-effect target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT17-020"] }],
          hand: [{ card: "BT1-085", as: "tai" }],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tai").instanceId)).toBe(true);
  });
});
