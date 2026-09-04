import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-033.js";

describe("EX8-033", () => {
  it("returns an NSo card from trash on play and digivolving and gives an opposing Digimon -4000 DP on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
    });
    expect(
      compiled.effects?.find((entry) => entry.trigger === "OnDeletion" && !entry.isInherited)?.actions[0],
    ).toMatchObject({ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      keywords: [{ keyword: "Recovery", amount: 1 }],
    });
  });
  it("returns an NSo card from trash on play and debuffs an opponent on deletion", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-033", as: "pumpkin" }], trash: [{ card: "EX8-034", as: "recovered" }] },
        1: { battleArea: [{ card: "AD1-001", as: "opponent" }], deck: ["BT1-045"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pumpkin").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("recovered").instanceId));
    expect(player.hand.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
    const before = s.state.players[1]!.battleArea[0]!.currentDP;
    const pumpkinPermanentId = player.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "EX8-033",
    )!.permanentId;
    await advance(s.engine).verb.deletePermanent([pumpkinPermanentId]);
    await settle(() => s.state.players[1]!.battleArea[0]!.currentDP === before - 4000);
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(before - 4000);
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(before);
  });

  it("returns an NSo card from trash on a real digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-032", as: "base" }],
          hand: [{ card: "EX8-033", as: "pumpkin" }],
          trash: [{ card: "EX8-034", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pumpkin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("pumpkin").instanceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("recovers the top card of the deck when deleted from an evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-089", as: "host", under: [{ card: "EX8-033", as: "pumpkin" }] }],
        security: 1,
        deck: [{ card: "AD1-001", as: "recovery" }],
      },
    });
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => player.security.length === 2);
    expect(player.security).toHaveLength(2);
    expect(player.deck).toHaveLength(0);
  });
});
