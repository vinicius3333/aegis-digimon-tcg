import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-061.js";
import "./BT10-066.js";

describe("BT10-061 SkullKnightmon: Mighty Axe Mode", () => {
  it("adds an eligible card and trashes the rest of the top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-061", as: "source" }],
          deck: [{ card: "BT10-092", as: "nene" }, "BT10-062", "BT10-064"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.trash.length === 2);
    expect(player.trash).toHaveLength(2);
  });

  it("still deletes after a two-card DigiXros when the reveal has no eligible card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-061", as: "source" },
            { card: "BT7-058", as: "skullKnightmon" },
            { card: "BT7-059", as: "deadlyAxemon" },
          ],
          deck: ["BT10-062", "BT10-064", "BT10-065"],
        },
        1: { battleArea: [{ card: "BT7-058", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("skullKnightmon").instanceId, s.inst("deadlyAxemon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.length === 3 &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("is treated as DeadlyAxemon in hand for DarkKnightmon's DigiXros rule", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-066", as: "darkKnightmon" },
            { card: "BT7-058", as: "skullKnightmon" },
            { card: "BT10-061", as: "mightyAxeMode" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const darkKnightmonId = s.inst("darkKnightmon").instanceId;
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: darkKnightmonId,
        digiXros: {
          materialInstanceIds: [s.inst("skullKnightmon").instanceId, s.inst("mightyAxeMode").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        ({ topCard, stack }) => topCard.instanceId === darkKnightmonId && stack.length === 2,
      ),
    );

    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });
});
