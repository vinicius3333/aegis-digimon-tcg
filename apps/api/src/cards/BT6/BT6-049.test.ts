import { describe, expect, it } from "vitest";
import { setupEngine, settle, settleAcrossTimers, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT5/BT5-091.js";
import "../BT7/BT7-089.js";
import "../BT13/BT13-007.js";
import "../P/P-063.js";
import "./BT6-049.js";

describe("BT6-049 Arbormon", () => {
  it("digivolves onto a green Tamer for 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "tamer" }],
        hand: [{ card: "BT6-049", as: "arbormon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("arbormon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT6-049" && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT6-049");
  });

  it("rejects a non-green Tamer as its alternate digivolution base", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "redTamer" }],
        hand: [{ card: "BT6-049", as: "arbormon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redTamer").permanentId,
        instanceId: s.inst("arbormon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("redTamer").topCard?.cardId).toBe("BT1-085");
  });
});

describe("BT6-049 Arbormon — KB Q&A rulings", () => {
  const digivolveOntoTamer = (s: EngineSetup, tamerAlias: string) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(tamerAlias).permanentId,
      instanceId: s.inst("arbormon").instanceId,
    });

  it.fails("treats the Tamer as a digivolving Digimon for digivolve triggers and can't-digivolve effects (Q1434)", async () => {
    const restricted = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-088", as: "tamer" },
          { card: "BT1-010", as: "digimon" },
        ],
        breeding: { card: "BT13-007" },
        hand: [{ card: "BT6-049", as: "arbormon" }],
        deck: ["BT1-010"],
      },
    });
    restricted.state.memory = 3;
    await restricted.ready();
    expect(observe(restricted.engine).isRestricted(restricted.perm("digimon"), "digivolve")).toBe(true);

    expect(digivolveOntoTamer(restricted, "tamer")).toMatchObject({ ok: false });
    expect(restricted.perm("tamer").topCard?.cardId).toBe("BT1-088");
    expect(restricted.state.memory).toBe(3);

    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-088", as: "tamer" },
            { card: "BT5-091", as: "takumi" },
          ],
          hand: [{ card: "BT6-049", as: "arbormon" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT6-049" && s.state.players[0]!.deck.length < 2);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("takumi").isSuspended).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("performs the digivolution bonus draw when it digivolves onto a Tamer (Q1435)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "tamer" }],
        hand: [{ card: "BT6-049", as: "arbormon" }],
        deck: [{ card: "BT1-010", as: "deckTop" }],
      },
    });
    s.state.memory = 3;

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("deckTop").instanceId]);
  });

  it("can't attack the turn it digivolves from a Tamer played that turn (Q1436)", async () => {
    const attackAfterDigivolving = async (enteredThisTurn: boolean) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT1-088", as: "tamer", enteredThisTurn }],
          hand: [{ card: "BT6-049", as: "arbormon" }],
          deck: ["BT1-010"],
        },
        1: { security: ["BT1-010"], deck: ["BT1-011"] },
      });
      s.state.memory = 3;
      expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
      await settle(() => s.perm("tamer").topCard?.cardId === "BT6-049" && s.state.players[0]!.deck.length === 0);
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tamer").permanentId,
        target: { kind: "player" },
      });
    };

    expect(await attackAfterDigivolving(true)).toMatchObject({ ok: false });
    expect(await attackAfterDigivolving(false)).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (Q1437)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "tamer" }],
        hand: [{ card: "BT6-049", as: "arbormon" }],
        deck: ["BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "defender", dp: 9000, suspended: true }] },
    });
    s.state.memory = 3;
    const tamerInstanceId = s.inst("tamer").instanceId;

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT6-049");
    const arbormonPermanentId = s.perm("tamer").permanentId;
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toContain(tamerInstanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: arbormonPermanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === arbormonPermanentId));
    const trashIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(trashIds).toContain(tamerInstanceId);
    expect(trashIds).toContain(s.inst("arbormon").instanceId);
  });

  it("does not gain the Security effect printed in a Tamer's lower text (Q1438)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-063", as: "ruli" },
          { card: "BT7-089", as: "jp" },
        ],
        hand: [
          { card: "BT6-049", as: "arbormon" },
          { card: "BT6-049", as: "secondArbormon" },
        ],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 5;

    expect(digivolveOntoTamer(s, "ruli")).toEqual({ ok: true });
    await settle(() => s.perm("ruli").topCard?.cardId === "BT6-049");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jp").permanentId,
        instanceId: s.inst("secondArbormon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jp").topCard?.cardId === "BT6-049");

    expect(observe(s.engine).canUseInheritedEffect(s.perm("ruli"), "P-063")).toBe(false);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("jp"), "BT7-089")).toBe(true);
  });

  it("gains the inherited effect printed in a Tamer's lower text (Q1439)", async () => {
    const attackAfterDigivolvingOnto = async (tamerCardId: string) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: tamerCardId, as: "tamer" }],
          hand: [{ card: "BT6-049", as: "arbormon" }],
          deck: ["BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "defender", suspended: true }],
          security: ["BT1-010"],
          deck: ["BT1-011"],
        },
      });
      s.state.memory = 3;
      const defenderInstanceId = s.perm("defender").topCard!.instanceId;
      expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
      await settle(() => s.perm("tamer").topCard?.cardId === "BT6-049" && s.state.players[0]!.deck.length === 0);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("tamer").permanentId,
          target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === defenderInstanceId));
      await settleAcrossTimers(() => s.state.players[1]!.security.length === 0, 20);
      return s;
    };

    const withPiercing = await attackAfterDigivolvingOnto("BT7-089");
    expect(withPiercing.state.players[1]!.security).toHaveLength(0);

    const withoutPiercing = await attackAfterDigivolvingOnto("BT1-088");
    expect(withoutPiercing.state.players[1]!.security).toHaveLength(1);
  });

  it("can't decline the digivolution once declared, and can't declare it without a valid base (Q4637)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "tamer" }],
        hand: [{ card: "BT6-049", as: "arbormon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;
    const seenDecisions: string[] = [];

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => {
      if (s.state.pendingDecision !== undefined) seenDecisions.push(s.state.pendingDecision.kind);
      return s.perm("tamer").topCard?.cardId === "BT6-049" && s.state.players[0]!.deck.length === 0;
    });
    expect(seenDecisions).toEqual([]);
    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT6-049");
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toContain("BT1-088");

    const withoutBase = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "redTamer" }],
        hand: [{ card: "BT6-049", as: "arbormon" }],
        deck: ["BT1-010"],
      },
    });
    withoutBase.state.memory = 3;

    expect(digivolveOntoTamer(withoutBase, "redTamer")).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(withoutBase.state.memory).toBe(3);
    expect(withoutBase.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT6-049"]);
    expect(withoutBase.perm("redTamer").topCard?.cardId).toBe("BT1-085");
  });
});
