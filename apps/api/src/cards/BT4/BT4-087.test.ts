import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-087.js";

describe("BT4-087 Anubismon", () => {
  it("plays a level 3 Digimon from trash for free and gives that Digimon Rush", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-012", as: "base" }], hand: [{ card: "BT4-087", as: "evolving" }], trash: [{ card: "BT10-071", as: "played" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => {
      const played = player.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId);
      return played !== undefined && observe(s.engine).hasKeyword(played, "Rush");
    });
    const played = player.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId)!;
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
  });
});
