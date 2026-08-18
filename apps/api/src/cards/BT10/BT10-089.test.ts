import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-089.js";

describe("BT10-089 Akari Hinomoto", () => {
  it("may play Dorulumon from hand without paying its cost", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-089", as: "source" }, { card: "BT10-034", as: "dorulumon" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some(p => p.topCard.instanceId === s.inst("dorulumon").instanceId));
    expect(s.state.memory).toBe(0);
  });

  it("plays Dorulumon from under another Tamer, then may suspend to draw for that Xros Heart play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-087", as: "host", under: [{ card: "BT10-034", as: "dorulumon" }] }],
        hand: [{ card: "BT10-089", as: "akari" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("akari").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    const akari = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("akari").instanceId)!;
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("dorulumon").instanceId)).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(akari.isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("cannot play Dorulumon from the stack of a Digimon that evolved from a Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-034", as: "digimonHost", under: [{ card: "BT10-034", as: "dorulumon" }] }],
        hand: [{ card: "BT10-089", as: "akari" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("akari").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("akari").instanceId));

    expect(s.perm("digimonHost").stack.some((card) => card.instanceId === s.inst("dorulumon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT10-034")).toHaveLength(1);
  });

  it("plays itself from security for free", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT10-089", as: "akari", faceUp: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("akari"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-089"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-089")).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
