import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-077.js";
import "./index.js";

describe("BT17-077 Imperialdramon: Paladin Mode", () => {
  it("trashes all opponent digivolution cards on play and when digivolving", () => {
    for (const effect of [compiled.effects?.[1], compiled.effects?.[2]]) {
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "TrashDigivolution",
        amount: 99,
        target: { count: "all", filter: { controller: "opponent", kind: ["Digimon"] } },
      });
    }
  });

  it("lets the activating player choose whose entire Trash returns to the bottom of the deck", () => {
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "Modal",
      choose: 1,
      options: [
        [
          {
            kind: "Return",
            to: "deckBottom",
            bindResultAs: "returnedTrashCards",
            target: { count: "all", filter: { zone: "trash", controller: "mine" } },
          },
        ],
        [
          {
            kind: "Return",
            to: "deckBottom",
            bindResultAs: "returnedTrashCards",
            target: { count: "all", filter: { zone: "trash", controller: "opponent" } },
          },
        ],
      ],
    });
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({
      kind: "GainMemory",
      amount: 3,
      condition: {
        kind: "bindingContains",
        ref: "returnedTrashCards",
        filter: { kind: ["Digimon"], colors: ["White"], levelComparison: { op: "eq", value: 7 } },
      },
    });
  });

  it("unsuspends by returning an opponent Digimon with no digivolution cards", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: { isSelf: true },
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "return",
            to: "deckBottom",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" } },
          },
        },
      ],
    });
  });

  it("deletes one opposing Digimon after a natural non-DNA play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-077", as: "paladin" }] },
        1: {
          battleArea: [
            { card: "BT17-063", as: "firstTarget" },
            { card: "BT17-063", as: "survivor" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paladin").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstTarget").instanceId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstTarget").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("survivor").instanceId)).toBe(true);
  });

  it("unsuspends after a natural attack returns a bare opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-077", as: "paladin" }] },
        1: { battleArea: [{ card: "BT17-063", as: "bareTarget" }], security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paladin").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("bareTarget").instanceId));

    expect(s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("bareTarget").instanceId)).toBe(true);
    expect(s.perm("paladin").isSuspended).toBe(false);
  });
});
