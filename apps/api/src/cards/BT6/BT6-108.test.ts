import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-081.js";
import "./BT6-108.js";

describe("BT6-108 Glaive Memory Boost!", () => {
  it("activates its Main effect from security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT6-108", as: "security", faceUp: true }],
        trash: [{ card: "BT6-069", as: "played" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const playedId = s.inst("played").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId)).toBe(true);
  });

  it("draws 1 when this card is trashed from hand by one of your effects", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT6-076", as: "base" }],
      hand: [{ card: "BT6-081", as: "evolving" }, { card: "BT6-108", as: "discard" }],
      deck: [{ card: "BT1-001", as: "digivolveDraw" }, { card: "BT1-002", as: "effectDraw" }],
    } }, { autoSelectCards: true, autoAcceptOptional: false });
    const player = s.state.players[0]!;
    const discardedId = s.inst("discard").instanceId;
    const effectDrawId = s.inst("effectDraw").instanceId;
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((card) => card.instanceId === effectDrawId));

    expect(player.trash.some((card) => card.instanceId === discardedId)).toBe(true);
    expect(player.deck).toHaveLength(0);
  });

  it("may play a purple level 4 or lower Digimon from trash for free", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT6-068"], hand: [{ card: "BT6-108", as: "option" }], trash: [{ card: "BT6-069", as: "played" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    const playedId = s.inst("played").instanceId;
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === playedId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === playedId)).toBe(false);
  });
});
