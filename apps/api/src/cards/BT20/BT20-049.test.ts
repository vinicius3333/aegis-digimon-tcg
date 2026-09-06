import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-049.js";
import "./index.js";

describe("BT20-049 Blimpmon", () => {
  it("prevents one opposing Digimon from attacking players through the opponent's turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Restrict",
            restriction: "attackPlayers",
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
        ],
      });
    }
  });

  it("has inherited Reboot", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Reboot" }],
    });
  });

  it("restricts exactly one opposing Digimon after both play and evolution", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(mode === "play"
              ? { hand: [{ card: "BT20-049", as: "blimpmon" }] }
              : {
                  battleArea: [{ card: "BT20-047", as: "base" }],
                  hand: [{ card: "BT20-049", as: "blimpmon" }],
                }),
          },
          1: {
            battleArea: [
              { card: "BT1-010", as: "target" },
              { card: "BT20-047", as: "peer" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 4;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blimpmon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("blimpmon").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attackPlayers"));
      expect(observe(s.engine).isRestricted(s.perm("target"), "attackPlayers")).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm("peer"), "attackPlayers")).toBe(false);
      s.state.turnSeat = 1;
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("target").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: false, reason: "illegal-target" });
    }
  });

  it("grants Reboot only while Blimpmon is an inherited source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-051", under: ["BT20-049"], as: "host" },
          { card: "BT20-049", as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Reboot")).toBe(false);
  });

  it("clears the player restriction at the real opponent turn end", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-049", as: "blimpmon" }] },
        1: {
          battleArea: [{ card: "BT1-010", as: "attacker" }],
          hand: [{ card: "BT20-001", as: "playable" }],
          deck: ["BT20-001", "BT20-001", "BT20-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blimpmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("attacker"), "attackPlayers"));
    s.state.memory = -4;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).isRestricted(s.perm("attacker"), "attackPlayers")).toBe(false);
  });
});
