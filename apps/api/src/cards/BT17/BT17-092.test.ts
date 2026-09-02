import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT17-092.js";

describe("BT17-092 Menoa Bellucci", () => {
  it("trashes Morphomon or Eosmon to draw two on play", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: { zone: "hand", nameOrTrait: [{ tokens: ["Morphomon", "Eosmon"], match: "name" }] },
            },
          },
        },
      ],
    });
  });

  it("uses a live All Turns timing mask for opponent Tamer On Play effects while Eosmon is present", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] } },
      actions: [
        {
          kind: "DisableTimingEffect",
          target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: "all" },
          timings: ["onPlay"],
          duration: "permanent",
        },
      ],
    });
  });

  it("prevents only an opponent-effect departure and pays by deleting another Eosmon", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "byOpponentEffect",
          sourceFilter: { nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] },
          actions: [
            {
              kind: "Prevent",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    excludeSelf: true,
                    excludeLeavingSubject: true,
                    nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }],
                  },
                  count: 1,
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("naturally trashes a Morphomon and draws two when played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-092", as: "menoa" },
            { card: "BT17-044", as: "morphomon" },
          ],
          deck: [
            { card: "BT1-001", as: "drawnOne" },
            { card: "BT1-002", as: "drawnTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("menoa").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("morphomon").instanceId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("morphomon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawnOne").instanceId, s.inst("drawnTwo").instanceId]),
    );
  });

  it("naturally suppresses an opponent Tamer's On Play effect while Eosmon is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-092", as: "menoa" },
            { card: "BT17-074", as: "eosmon" },
          ],
        },
        1: { hand: [{ card: "BT17-087", as: "marcus" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-087"));

    expect(observe(s.engine).timingEffectDisabled(s.perm("marcus"), "onPlay")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(false);
  });

  it("naturally uses the once-per-turn replacement only for an opponent-effect departure", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-092", as: "menoa" },
            { card: "BT17-074", as: "protectedEosmon" },
            { card: "BT17-074", as: "otherEosmon" },
          ],
        },
        1: {
          hand: [
            { card: "BT17-017", as: "firstAncient" },
            { card: "BT17-017", as: "secondAncient" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 30;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstAncient").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074").length === 1,
    );
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074")).toHaveLength(
      1,
    );

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondAncient").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074").length === 0,
    );
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074")).toHaveLength(
      0,
    );
  });

  it("plays itself from Security without paying its cost", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("naturally plays itself from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT17-092", as: "securityMenoa" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-092"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-092")).toBe(true);
  });
});
