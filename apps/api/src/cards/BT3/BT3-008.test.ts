import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-001.js";
import "./BT3-008.js";

describe("BT3-008 Zubamon", () => {
  it("adds RagnaLoardmon and a revealed Legend-Arms Digimon to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-008", as: "source" }],
          deck: [
            { card: "BT3-019", as: "ragna" },
            { card: "BT3-010", as: "legendArms" },
            "BT3-014",
            "BT3-015",
            "BT3-017",
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

  it("adds only one card when the five-card reveal contains only RagnaLoardmon targets", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-008", as: "source" }],
          deck: [{ card: "BT3-019", as: "ragna" }, "BT3-014", "BT3-015", "BT3-017", "BT3-018"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ragna").instanceId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("does not count a Legend-Arms Option toward the Digimon slot", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-008", as: "source" }],
          deck: [
            { card: "BT3-019", as: "ragna" },
            { card: "EX6-065", as: "option" },
            "BT3-014",
            "BT3-015",
            "BT3-017",
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ragna").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("ragna").instanceId]);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("can add two revealed RagnaLoardmon cards when both satisfy the two categories", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-008", as: "source" }],
          deck: [
            { card: "BT3-019", as: "firstRagna" },
            { card: "BT3-019", as: "secondRagna" },
            "BT3-014",
            "BT3-015",
            "BT3-017",
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT3-019", "BT3-019"]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("does not activate On Play when Zubamon digivolves from its legal red level 2 route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-001", as: "base" }],
        hand: [{ card: "BT3-008", as: "source" }],
        deck: [
          { card: "BT3-014", as: "drawn" },
          { card: "BT3-019", as: "notAdded" },
          "BT3-015",
          "BT3-017",
          "BT3-018",
        ],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("source").instanceId);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notAdded").instanceId)).toBe(true);
  });
});
