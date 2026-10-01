import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-062.js";

describe("BT3-062 Ludomon", () => {
  it("adds RagnaLoardmon and a revealed Legend-Arms Digimon to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-062", as: "source" }],
          deck: [
            { card: "BT3-019", as: "ragna" },
            { card: "BT3-064", as: "legendArms" },
            "BT3-068",
            "BT3-070",
            "BT3-071",
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("ragna").instanceId, s.inst("legendArms").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(3);
  });
});

describe("BT3-062 Ludomon — KB Q&A rulings", () => {
  const playLudomonRevealing = async (revealed: string[]) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-062", as: "ludomon" }],
          deck: [
            ...revealed.map((card, index) => ({ card, as: `revealed${index}` })),
            { card: "BT1-009", as: "sixthCard" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const ludomonId = s.inst("ludomon").instanceId;
    const revealedIds = revealed.map((_, index) => s.inst(`revealed${index}`).instanceId);
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ludomonId })).toEqual({ ok: true });
    const sixthCardId = s.inst("sixthCard").instanceId;
    await settle(() => player.deck[0]?.instanceId === sixthCardId);
    const addedIds = player.hand.map((card) => card.instanceId).filter((id) => revealedIds.includes(id));
    return { s, player, revealedIds, addedIds };
  };

  it("adds only 1 card when the reveal holds Legend-Arms Digimon but no RagnaLoardmon (Q1089)", async () => {
    const onlyLegendArms = await playLudomonRevealing(["BT3-064", "BT3-069", "BT3-068", "BT3-070", "BT3-071"]);
    expect(onlyLegendArms.addedIds).toHaveLength(1);
    expect(onlyLegendArms.revealedIds.slice(0, 2)).toContain(onlyLegendArms.addedIds[0]);
    expect(onlyLegendArms.player.deck[0]!.instanceId).toBe(onlyLegendArms.s.inst("sixthCard").instanceId);
    expect(onlyLegendArms.player.deck).toHaveLength(5);

    const onlyRagnaLoardmon = await playLudomonRevealing(["BT3-019", "BT3-068", "BT3-070", "BT3-071", "BT1-010"]);
    expect(onlyRagnaLoardmon.addedIds).toEqual([onlyRagnaLoardmon.revealedIds[0]]);
    expect(onlyRagnaLoardmon.player.deck).toHaveLength(5);
  });

  it("adds both revealed RagnaLoardmon cards because each also has the Legend-Arms type (Q1090)", async () => {
    const { player, revealedIds, addedIds } = await playLudomonRevealing([
      "BT3-019",
      "ST13-06",
      "BT3-068",
      "BT3-070",
      "BT3-071",
    ]);
    expect(addedIds).toEqual(expect.arrayContaining(revealedIds.slice(0, 2)));
    expect(addedIds).toHaveLength(2);
    expect(player.deck).toHaveLength(4);
  });

  it("adds both a RagnaLoardmon and a Legend-Arms Digimon and sends only the rest to the deck bottom (Q1091)", async () => {
    const { s, player, revealedIds, addedIds } = await playLudomonRevealing([
      "BT3-068",
      "BT3-019",
      "BT3-070",
      "BT3-064",
      "BT3-071",
    ]);
    expect(addedIds).toEqual(expect.arrayContaining([revealedIds[1], revealedIds[3]]));
    expect(addedIds).toHaveLength(2);
    expect(player.deck[0]!.instanceId).toBe(s.inst("sixthCard").instanceId);
    expect(player.deck.slice(1).map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([revealedIds[0], revealedIds[2], revealedIds[4]]),
    );
    expect(player.deck).toHaveLength(4);
  });
});
