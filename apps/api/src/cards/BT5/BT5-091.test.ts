import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-091.js";

const TAKUMI = "BT5-091";
const LV3_DIGIMON = "BT1-009";
const DUMMY_TARGET = "BT1-010";

describe('BT5-091 [All Turns] level 3 Digimon gain "[When Attacking] Lose 1 memory."', () => {
  it("may suspend to draw when one of your Digimon digivolves during your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAKUMI, as: "takumi" },
            { card: "BT5-063", as: "base" },
          ],
          hand: [{ card: "BT5-067", as: "evolving" }],
          deck: [{ card: "BT1-009", as: "draw" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takumi").isSuspended && s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("draw").instanceId]);
  });

  it("does not trigger the draw watcher during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: TAKUMI, as: "takumi" },
          { card: "BT5-063", as: "base" },
        ],
        hand: [{ card: "BT5-067", as: "evolving" }],
        deck: [
          { card: "BT1-009", as: "drawnByDigivolution" },
          { card: "BT1-010", as: "shouldRemain" },
        ],
      },
      1: { battleArea: [{ card: DUMMY_TARGET, as: "opponent" }] },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("evolving").instanceId);

    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawnByDigivolution").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("shouldRemain").instanceId]);
  });

  it("may decline the digivolution draw, leaving the Tamer ready", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAKUMI, as: "takumi" },
            { card: "BT5-063", as: "base" },
          ],
          hand: [{ card: "BT5-067", as: "evolving" }],
          deck: [{ card: "BT1-009", as: "draw" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-067");

    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("draw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("loses 1 memory when a level 3 Digimon it granted the ability to attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAKUMI, dp: 0, as: "takumi" },
            { card: LV3_DIGIMON, dp: 3000, as: "attacker" },
          ],
          security: 3,
        },
        1: { battleArea: [{ card: DUMMY_TARGET, dp: 2000, as: "oppTarget", suspended: true }], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("oppTarget").permanentId },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => s.state.memory !== 5, 400);

    expect(s.state.memory).toBe(4);
  });

  it("loses 2 memory when two Takumi Aiba copies grant the same level 3 Digimon the effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAKUMI, as: "takumiA" },
            { card: TAKUMI, as: "takumiB" },
            { card: LV3_DIGIMON, dp: 3000, as: "attacker" },
          ],
          security: 3,
        },
        1: { battleArea: [{ card: DUMMY_TARGET, dp: 2000, as: "oppTarget", suspended: true }], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("oppTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory !== 5, 400);

    expect(s.state.memory).toBe(3);
  });

  it("also applies the level 3 attack penalty to an opponent's attacking Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: TAKUMI, as: "takumi" }], security: 3 },
      1: { battleArea: [{ card: LV3_DIGIMON, as: "attacker" }], security: 3 },
    });
    s.state.turnSeat = 1;
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended, 400);

    expect(s.state.memory).toBe(4);
  });

  it("does NOT lose memory when a level 4+ Digimon attacks (grant is level-3-only)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAKUMI, dp: 0, as: "takumi" },
            { card: "AD1-010", dp: 5000, as: "attacker" },
          ],
          security: 3,
        },
        1: { battleArea: [{ card: DUMMY_TARGET, dp: 2000, as: "oppTarget", suspended: true }], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("oppTarget").permanentId },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => s.state.players[1]?.battleArea.length === 0, 400);

    expect(s.state.memory).not.toBe(4);
  });
});
