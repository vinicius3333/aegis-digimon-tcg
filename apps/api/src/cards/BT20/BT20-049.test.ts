import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-049.js";
import "./index.js";

describe("BT20-049 Blimpmon", () => {
  it("prevents one opposing Digimon from attacking players through the opponent's turn", () => {
    expect(getCardDefinition("BT20-049")).toMatchObject({
      cardId: "BT20-049",
      nameEn: "Blimpmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Machine"],
    });
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

  it("pays exact printed play and evolution costs across the memory boundary", async () => {
    const play = setupEngine({
      0: { hand: [{ card: "BT20-049", as: "blimpmon" }] },
    });
    play.state.memory = 3;
    await play.ready();
    expect(play.engine.applyIntent(0, { type: "playCard", instanceId: play.inst("blimpmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => play.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-049"));
    expect(play.state.memory).toBe(-1);
    expect(play.state.players[0]!.hand).not.toContain(play.inst("blimpmon"));

    const evolve = setupEngine({
      0: { battleArea: [{ card: "BT20-047", as: "base" }], hand: [{ card: "BT20-049", as: "blimpmon" }] },
    });
    evolve.state.memory = 1;
    await evolve.ready();
    expect(
      evolve.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolve.perm("base").permanentId,
        instanceId: evolve.inst("blimpmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => evolve.perm("base").topCard.cardId === "BT20-049");
    expect(evolve.state.memory).toBe(-1);
    expect(evolve.perm("base").stack.map((card) => card.cardId)).toEqual(["BT20-047"]);
    expect(evolve.state.players[0]!.hand).not.toContain(evolve.inst("blimpmon"));
  });

  it("restricts exactly one opposing Digimon after both play and evolution", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(mode === "play"
              ? {
                  battleArea: [{ card: "BT1-010", dp: 1000, suspended: true, as: "victim" }],
                  hand: [{ card: "BT20-049", as: "blimpmon" }],
                }
              : {
                  battleArea: [
                    { card: "BT20-047", as: "base" },
                    { card: "BT1-010", dp: 1000, suspended: true, as: "victim" },
                  ],
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
      expect(s.state.memory).toBe(mode === "play" ? 0 : 2);
      s.state.turnSeat = 1;
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("target").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: false, reason: "illegal-target" });
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("target").permanentId,
          target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010")).toBe(false);
    }
  });

  it("grants Reboot only while Blimpmon is an inherited source and reboots it on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-053", under: ["BT20-049"], suspended: true, as: "host" },
          { card: "BT20-049", suspended: true, as: "standalone" },
        ],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
      1: { deck: ["BT1-010", "BT1-010", "BT1-010"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Reboot")).toBe(false);
    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("standalone").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("clears the player restriction at the real opponent turn end", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-049", as: "blimpmon" }] },
        1: {
          battleArea: [{ card: "BT1-010", as: "attacker" }],
          hand: [{ card: "BT1-010", as: "playable" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
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
