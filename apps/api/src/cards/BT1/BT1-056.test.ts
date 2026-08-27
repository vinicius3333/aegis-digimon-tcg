import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-056.js";

describe("BT1-056 Petermon", () => {
  it("plays Tinkermon from trash without paying its memory cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-056", as: "petermon" }],
          trash: [{ card: "BT1-047", as: "tinkermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const tinkermonId = s.inst("tinkermon").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.instanceId === tinkermonId));

    expect(s.state.memory).toBe(0);
    expect(player.trash).toHaveLength(0);
  });

  it("plays Tinkermon from hand and the newly played Digimon cannot attack that turn (Q916)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT1-056", as: "petermon" },
            { card: "BT1-047", as: "tinkermon" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnCount = 1;
    const tinkermonId = s.inst("tinkermon").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === tinkermonId),
    );
    const tinkermon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === tinkermonId)!;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: tinkermon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.state.memory).toBe(0);
  });

  it("plays only one Tinkermon when copies exist in both hand and trash (Q915)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT1-056", as: "petermon" },
            { card: "BT1-047", as: "handTinkermon" },
          ],
          trash: [{ card: "BT1-047", as: "trashTinkermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-047")).toHaveLength(
      1,
    );
    expect(
      s.state.players[0]!.hand.filter((card) => card.cardId === "BT1-047").length +
        s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-047").length,
    ).toBe(1);
  });

  it("may decline to play Tinkermon", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-056", as: "petermon" }],
        trash: [{ card: "BT1-047", as: "tinkermon" }],
      },
    });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("does not play an opponent's Tinkermon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-056", as: "petermon" }] },
        1: { hand: [{ card: "BT1-047", as: "opponentTinkermon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT1-056");
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(
      s.inst("opponentTinkermon").instanceId,
    );
  });
});
