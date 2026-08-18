import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-029.js";
import "./BT8-022.js";

describe("BT8-029 Frozomon", () => {
  it("has Blocker and can't attack while the opponent has a Digimon with sources", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-029", as: "frozomon" }] }, 1: { battleArea: [{ card: "BT8-042", under: ["BT8-034"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("frozomon"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("frozomon").permanentId, target: { kind: "player" } }).ok).toBe(false);
  });

  it("returns an opposing level 3 when an opponent's digivolution card is trashed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-031", as: "host", under: ["BT8-029"] }, "BT8-021"], hand: [{ card: "BT8-022", as: "snowAgumon" }] },
      1: { battleArea: [{ card: "BT8-042", as: "sourceTarget", under: ["BT8-034"] }, { card: "BT8-033", as: "returned" }] },
    }, { autoSelectCards: true });
    s.state.memory = 5;
    const returnedId = s.perm("returned").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("snowAgumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === returnedId));
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });
});
