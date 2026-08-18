import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-075.js";

describe("BT10-075 Damemon", () => {
  it("plays Yuu Amano from hand when none is in play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-075", as: "source" }, { card: "BT10-093", as: "yuu" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some(p => p.topCard.instanceId === s.inst("yuu").instanceId));
    expect(player.hand.some(c => c.instanceId === s.inst("yuu").instanceId)).toBe(false);
  });

  it("plays Yuu Amano after digivolving when none is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-071", as: "base" }],
          hand: [{ card: "BT10-075", as: "damemon" }, { card: "BT10-093", as: "yuu" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("damemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("yuu").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yuu").instanceId)).toBe(false);
  });

  it("does not offer another Yuu Amano when one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-093", as: "existingYuu" }],
          hand: [{ card: "BT10-075", as: "source" }, { card: "BT10-093", as: "handYuu" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("handYuu").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT10-093")).toHaveLength(1);
  });

  it("uses Save to place itself under one of its Tamers on deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT10-075", as: "damemon" }, { card: "BT1-085", as: "tamer" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const damemonId = s.perm("damemon").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("damemon").permanentId]);
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === damemonId));

    expect(s.perm("tamer").stack.some((card) => card.instanceId === damemonId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === damemonId)).toBe(false);
  });

  it("gains owner memory when its inherited source is trashed on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-081", as: "host", under: [{ card: "BT10-075", as: "source" }] }] },
    }, { autoOrderTriggers: true });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("source").instanceId],
      1,
    );
    await settle(() => s.state.memory === -1);

    expect(s.state.memory).toBe(-1);
  });
});
