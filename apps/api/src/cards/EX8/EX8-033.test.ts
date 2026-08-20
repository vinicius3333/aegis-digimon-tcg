import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-033.js";

describe("EX8-033", () => {
  it("returns an NSo card from trash on play and digivolving and gives an opposing Digimon -4000 DP on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Return", to: "hand", target: { count: 1 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Return", to: "hand" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion" && !entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" });
  });
  it("inherits Recovery +1 (Deck)", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Recovery", amount: 1, raw: "＜Recovery +1 (Deck)＞" }));

  it("returns an NSo card from trash on play and debuffs an opponent on deletion", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX8-033", as: "pumpkin" }], trash: [{ card: "EX8-034", as: "recovered" }] }, 1: { battleArea: [{ card: "AD1-001", as: "opponent" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pumpkin").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("recovered").instanceId));
    expect(player.hand.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
    const before = s.state.players[1]!.battleArea[0]!.currentDP;
    const pumpkinPermanentId = player.battleArea.find((permanent) => permanent.topCard?.cardId === "EX8-033")!.permanentId;
    await advance(s.engine).verb.deletePermanent([pumpkinPermanentId]);
    await settle(() => s.state.players[1]!.battleArea[0]!.currentDP === before - 4000);
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(before - 4000);
  });
});
