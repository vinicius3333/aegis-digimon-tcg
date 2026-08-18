import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-015.js";

describe("BT10-015 Shoutmon X5B", () => {
  it("DigiXroses with Shoutmon X5 and Beelzemon, takes material from under Taiki, and plays a level 4 from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{
            card: "BT10-087",
            as: "taiki",
            under: [{ card: "BT10-034", as: "dorulumon" }],
          }],
          hand: [
            { card: "BT10-015", as: "shoutmonX5B" },
            { card: "BT10-013", as: "shoutmonX5" },
            { card: "BT10-082", as: "beelzemon" },
          ],
          trash: [{ card: "BT10-049", as: "ballistamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("shoutmonX5B").instanceId,
      digiXros: {
        materialInstanceIds: [s.inst("shoutmonX5").instanceId, s.inst("beelzemon").instanceId],
      },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("ballistamon").instanceId,
    ));

    const x5b = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("shoutmonX5B").instanceId,
    )!;
    expect(x5b.stack[0]?.instanceId).toBe(s.inst("dorulumon").instanceId);
    expect(x5b.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      s.inst("shoutmonX5").instanceId,
      s.inst("beelzemon").instanceId,
    ]));
    expect(s.perm("taiki").stack).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("places Beelzemon from hand under itself, then plays a level 4 Xros Heart from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-015", as: "source" }, { card: "BT10-082", as: "beelzemon" }],
          trash: [{ card: "BT10-034", as: "played" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("beelzemon").instanceId, s.inst("played").instanceId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => {
      const x5b = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId);
      return s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId) &&
        x5b !== undefined && observe(s.engine).hasKeyword(x5b, "Armor Purge");
    });

    const x5b = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId)!;
    expect(x5b.stack[0]?.instanceId).toBe(s.inst("beelzemon").instanceId);
    expect(x5b.stack.some((card) => card.instanceId === s.inst("beelzemon").instanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(x5b, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(x5b, "Armor Purge")).toBe(true);
  });

  it("accepts the Xros Heart material from under one of your Tamers", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-015", as: "source" }],
          battleArea: [{ card: "BT10-087", as: "tamer", under: [{ card: "BT10-034", as: "material" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("material").instanceId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => {
      const x5b = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId);
      return x5b?.stack.some((card) => card.instanceId === s.inst("material").instanceId) === true;
    });

    expect(s.perm("tamer").stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(false);
  });

  it("runs the same sequence when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", as: "base" }],
          hand: [{ card: "BT10-015", as: "evolving" }, { card: "BT10-082", as: "beelzemon" }],
          trash: [{ card: "BT10-049", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("beelzemon").instanceId, s.inst("played").instanceId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId));

    expect(s.perm("base").stack[0]?.instanceId).toBe(s.inst("beelzemon").instanceId);
  });

  it("does not play from trash when Beelzemon is absent from its digivolution cards", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT10-015", as: "source" }], trash: [{ card: "BT10-034", as: "candidate" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
  });

  it("does not treat Beelzemon: Blast Mode as the exact Beelzemon source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-015", as: "x5b", under: ["EX2-074"] }],
          trash: [{ card: "BT10-034", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("x5b"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
  });
});
