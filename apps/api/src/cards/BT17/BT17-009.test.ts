import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-009.js";

describe("BT17-009", () => {
  it("reveals three and adds a Hybrid/Ten Warriors card or inherited-effect Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            {
              count: 1,
              to: "hand",
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }],
              },
            },
            {
              count: 1,
              to: "hand",
              filter: { controllerDefault: "mine", kind: ["Tamer"], hasInheritedEffects: true },
            },
          ],
        },
      ],
    });
  });

  it("plays an inherited-effect Tamer from hand on deletion as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: { filter: { zone: "hand" } },
        },
      ],
    });
  });

  it("adds one Hybrid and one eligible Tamer from the top three", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT17-009", as: "flamemon" }], deck: ["BT17-023", "BT17-083", "BT1-009"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flamemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT17-023"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-023", "BT17-083"]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("plays an inherited-effect Tamer when the host is naturally deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-010", as: "host", under: ["BT17-001", "BT17-009"], suspended: true }],
          hand: [{ card: "BT17-083", as: "inheritedTamer" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT17-013", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 1 &&
        s.state.players[0]!.battleArea[0]!.topCard?.instanceId === s.inst("inheritedTamer").instanceId,
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard?.cardId).toBe("BT17-083");
  });
});
