import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-095.js";

describe("BT4-095 Yoshino Fujieda", () => {
  it("returns a Digi-Egg from trash to the bottom of the Digi-Egg deck", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-095", as: "yoshino" }],
          eggDeck: [{ card: "BT1-007", as: "existingEgg" }],
          trash: [{ card: "BT1-008", as: "returnedEgg" }],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const returnedEggId = s.inst("returnedEgg").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yoshino").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.eggDeck.length === 2);

    expect(player.trash).toHaveLength(0);
    expect(player.deck).toHaveLength(0);
    expect(player.eggDeck.map((card) => card.instanceId)).toEqual([s.inst("existingEgg").instanceId, returnedEggId]);
  });

  it("does not move a non-Digi-Egg card from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-095", as: "yoshino" }],
          eggDeck: [{ card: "BT1-007", as: "existingEgg" }],
          trash: [{ card: "BT4-016", as: "nonEgg" }],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yoshino").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      player.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("yoshino").instanceId),
    );

    expect(player.trash.map((card) => card.instanceId)).toEqual([s.inst("nonEgg").instanceId]);
    expect(player.eggDeck.map((card) => card.instanceId)).toEqual([s.inst("existingEgg").instanceId]);
  });

  it("suspends to reduce a Digi-Burst digivolution cost by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-095", as: "yoshino" },
            { card: "BT4-051", as: "base" },
          ],
          hand: [{ card: "BT4-054", as: "evolving" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yoshino").isSuspended && s.perm("base").topCard.cardId === "BT4-054");
    expect(s.state.memory).toBe(1);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-095", as: "securityTamer", faceUp: true }] } });
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});
