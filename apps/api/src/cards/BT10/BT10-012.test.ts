import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-012.js";

describe("BT10-012 Shoutmon X4B", () => {
  it("DigiXroses with Shoutmon X4 and Beelzemon, takes a Xros Heart card from under a Tamer, and returns two from trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "BT10-087",
          as: "taiki",
          under: [{ card: "BT10-034", as: "dorulumon" }],
        }],
        hand: [
          { card: "BT10-012", as: "shoutmonX4B" },
          { card: "BT10-009", as: "shoutmonX4" },
          { card: "BT10-082", as: "beelzemon" },
        ],
        trash: [
          { card: "BT10-007", as: "dondokomon" },
          { card: "BT10-029", as: "starmons" },
        ],
      },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
      preferInstanceIds: [],
    });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("shoutmonX4B").instanceId,
      digiXros: {
        materialInstanceIds: [s.inst("shoutmonX4").instanceId, s.inst("beelzemon").instanceId],
      },
    })).toEqual({ ok: true });
    await settle(() =>
      player.hand.some((card) => card.instanceId === s.inst("dondokomon").instanceId) &&
      player.hand.some((card) => card.instanceId === s.inst("starmons").instanceId),
    );

    const x4b = player.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("shoutmonX4B").instanceId)!;
    expect(x4b.stack[0]?.instanceId).toBe(s.inst("dorulumon").instanceId);
    expect(x4b.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      s.inst("shoutmonX4").instanceId,
      s.inst("beelzemon").instanceId,
    ]));
    expect(s.perm("taiki").stack).toHaveLength(0);
    expect(player.trash).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("runs the same placement and return clauses when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "BT10-009",
          as: "base",
          under: [{ card: "BT10-082", as: "beelzemon" }],
        }],
        hand: [
          { card: "BT10-012", as: "shoutmonX4B" },
          { card: "BT10-034", as: "dorulumon" },
        ],
        trash: [
          { card: "BT10-007", as: "dondokomon" },
          { card: "BT10-029", as: "starmons" },
        ],
      },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
    });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("shoutmonX4B").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      player.hand.some((card) => card.instanceId === s.inst("dondokomon").instanceId) &&
      player.hand.some((card) => card.instanceId === s.inst("starmons").instanceId),
    );

    const evolved = player.battleArea.find((permanent) => permanent.permanentId === s.perm("base").permanentId)!;
    expect(evolved.topCard.instanceId).toBe(s.inst("shoutmonX4B").instanceId);
    expect(evolved.stack[0]?.instanceId).toBe(s.inst("dorulumon").instanceId);
    expect(player.trash).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("does not return Xros Heart cards from trash without Beelzemon in its sources", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT10-012", as: "shoutmonX4B" },
          { card: "BT10-034", as: "dorulumon" },
        ],
        trash: [
          { card: "BT10-007", as: "dondokomon" },
          { card: "BT10-029", as: "starmons" },
        ],
      },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("shoutmonX4B").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("shoutmonX4B").instanceId,
    ));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      s.inst("dondokomon").instanceId,
      s.inst("starmons").instanceId,
    ]));
    assertNoLoudGap(s);
  });

  it("does not treat Beelzemon: Blast Mode as the exact Beelzemon source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "x4b", under: ["EX2-074"] }],
          trash: [{ card: "BT10-007", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("x4b"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
  });

  it("Armor Purges after losing a battle, trashing X4B and promoting Shoutmon X4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "BT10-012",
          as: "shoutmonX4B",
          suspended: true,
          under: [{ card: "BT10-009", as: "shoutmonX4" }],
        }],
      },
      1: { battleArea: [{ card: "BT10-082", as: "attacker", dp: 12000 }] },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
    });
    s.state.turnSeat = 1;
    const permanentId = s.perm("shoutmonX4B").permanentId;
    const x4bId = s.perm("shoutmonX4B").topCard.instanceId;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.permanentId === permanentId && permanent.topCard.instanceId === s.inst("shoutmonX4").instanceId,
      ),
    );

    const survivor = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === permanentId)!;
    expect(survivor.topCard.instanceId).toBe(s.inst("shoutmonX4").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === x4bId)).toBe(true);
    assertNoLoudGap(s);
  });
});
