import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-098.js";

describe("BT6-098 Raddle Star", () => {
  it("activates its Main effect from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-098", as: "security", faceUp: true }] },
      1: { battleArea: [{ card: "BT6-021", as: "target" }] },
    }, { autoSelectCards: true });
    const targetInstanceId = s.perm("target").topCard.instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });

  it("returns a level 5 or lower Digimon to hand when the opponent has fewer than 3 Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT6-019"], hand: [{ card: "BT6-098", as: "option" }] },
      1: { battleArea: [{ card: "BT6-021", as: "target", under: ["BT6-020"] }] },
    }, { autoSelectCards: true });
    s.state.memory = 7;
    const targetInstanceId = s.perm("target").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId));

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT6-020")).toBe(true);
  });

  it("returns any chosen Digimon to deck bottom instead when the opponent has 3 or more", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT6-019"], hand: [{ card: "BT6-098", as: "option" }] },
      1: { battleArea: [
        { card: "BT6-044", as: "target", under: ["BT6-020"] },
        { card: "BT1-009", as: "other1" },
        { card: "BT1-014", as: "other2" },
      ] },
    }, { autoSelectCards: true });
    s.state.memory = 7;
    const targetInstanceId = s.perm("target").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === targetInstanceId));

    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(targetInstanceId);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT6-020")).toBe(true);
  });
});
