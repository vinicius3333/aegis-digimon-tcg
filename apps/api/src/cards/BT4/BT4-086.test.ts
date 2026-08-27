import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-086.js";

describe("BT4-086 Cerberusmon: Werewolf Mode", () => {
  it("may delete a Cerberusmon to gain 9 memory", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT4-086", as: "source" }], battleArea: [{ card: "BT4-083", as: "cerberusmon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const costId = s.perm("cerberusmon").permanentId;
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !player.battleArea.some((p) => p.permanentId === costId) && s.state.memory === 9);
    expect(player.trash.some((card) => card.cardId === "BT4-083")).toBe(true);
    const played = player.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId)!;
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
  });

  it("does not treat Werewolf Mode itself or another Werewolf Mode as [Cerberusmon]", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-086", as: "source" }],
          battleArea: [{ card: "BT4-086", as: "otherWerewolf" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      player.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("source").instanceId),
    );

    expect(player.battleArea).toHaveLength(2);
    expect(player.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("allows declining the optional deletion cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-086", as: "source" }],
          battleArea: [{ card: "BT4-083", as: "cerberusmon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const costId = s.perm("cerberusmon").permanentId;
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      player.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("source").instanceId),
    );

    expect(player.battleArea.some((permanent) => permanent.permanentId === costId)).toBe(true);
    expect(player.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });
});
