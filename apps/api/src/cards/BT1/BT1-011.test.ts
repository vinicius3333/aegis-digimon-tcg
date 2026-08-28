import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-011.js";

describe("BT1-011 Agumon Expert", () => {
  it("returns an Agumon Digimon from trash to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-011", as: "expert" }],
          trash: [
            { card: "BT1-010", as: "agumon" },
            { card: "BT1-012", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const agumonId = s.inst("agumon").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("expert").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === agumonId));

    expect(player.trash.map((card) => card.instanceId)).not.toContain(agumonId);
    expect(player.trash.map((card) => card.instanceId)).toContain(s.inst("other").instanceId);
  });

  it("matches a Digimon whose longer name contains Agumon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-011", as: "expert" }], trash: [{ card: "BT6-018", as: "bond" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const bondId = s.inst("bond").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("expert").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === bondId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bondId)).toBe(true);
  });

  it("does not return a non-Digimon card whose name contains Agumon", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-011", as: "expert" }],
        trash: [
          { card: "AD1-021", as: "agumonTamer" },
          { card: "BT1-012", as: "otherDigimon" },
        ],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("expert").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-011"));

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("agumonTamer").instanceId, s.inst("otherDigimon").instanceId]),
    );
  });

  it("does not fire its On Play effect when Agumon Expert is digivolved", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "base" }],
        hand: [{ card: "BT1-011", as: "expert" }],
        trash: [{ card: "BT1-010", as: "agumon" }],
        deck: [{ card: "BT1-013", as: "drawn" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("expert").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("expert").instanceId);

    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(s.inst("base").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("agumon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("agumon").instanceId);
  });
});
