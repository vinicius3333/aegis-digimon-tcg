import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_046 } from "./BT25-046.js";
import "../index.js";

describe("BT25-046 Gekkomon", () => {
  it("reveals three and adds Glowing Dawn plus green BEATBREAK", () => {
    const effect = BT25_046.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const reveal = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(reveal?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: {
          controllerDefault: "mine",
          colors: ["Green"],
          nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }],
        },
      }),
    ]);
  });

  it("resolves both search pools through a natural On Play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-046", as: "gekkomon" }],
          deck: [
            { card: "BT25-041", as: "glowing" },
            { card: "BT25-046", as: "beatbreak" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("glowing").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("beatbreak").instanceId) &&
        s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("rest").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("glowing").instanceId, s.inst("beatbreak").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("searches a Glowing Dawn card independently when no green BEATBREAK card is present", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-046", as: "gekkomon" }],
          deck: ["BT25-041", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT25-046") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT25-041"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-041"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("searches a green BEATBREAK card and excludes a purple BEATBREAK card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-046", as: "gekkomon" }],
          deck: ["BT25-079", "BT25-049", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT25-046") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT25-049"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-049"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT25-079", "BT1-009"]);
  });

  it("uses the public zero-cost Glowing Dawn Lv.2 alternate evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST23-01", as: "egg" }],
        hand: [{ card: "BT25-046", as: "gekkomon" }],
        deck: [{ card: "BT1-009" }, { card: "BT1-010" }, { card: "BT1-011" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("gekkomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT25-046");
    expect(s.state.memory).toBe(0);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["ST23-01"]);
  });

  it("uses the ordinary green Lv.2 route from a non-Glowing Dawn source and completes On Play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-007", as: "greenEgg" }],
        hand: [{ card: "BT25-046", as: "gekkomon" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenEgg").permanentId,
        instanceId: s.inst("gekkomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("greenEgg").topCard.cardId === "BT25-046" &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT25-046"),
    );
    expect(s.state.memory).toBe(0);
    expect(s.perm("greenEgg").topCard.cardId).toBe("BT25-046");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
  });

  it("rejects a wrong-color, non-Glowing Dawn Lv.2 source on both routes", async () => {
    const alternate = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "redEgg" }], hand: [{ card: "BT25-046", as: "gekkomon" }] },
    });
    await alternate.ready();
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("redEgg").permanentId,
        instanceId: alternate.inst("gekkomon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });

    const ordinary = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "redEgg" }], hand: [{ card: "BT25-046", as: "gekkomon" }] },
    });
    await ordinary.ready();
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinary.perm("redEgg").permanentId,
        instanceId: ordinary.inst("gekkomon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("executes inherited Piercing after a public battle win", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-050", as: "winner", under: ["BT25-046"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "loser", suspended: true }], security: ["BT1-010"] },
    });
    await s.ready();
    const winnerId = s.perm("winner").permanentId;
    expect(observe(s.engine).hasPierce(s.perm("winner"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: s.perm("loser").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === winnerId)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not check security when the inherited Piercing attacker loses", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-050", as: "losing", under: ["BT25-046"], dp: 1000 }] },
      1: { battleArea: [{ card: "BT25-041", as: "winner", suspended: true, dp: 12000 }], security: ["BT1-010"] },
    });
    await s.ready();
    const losingId = s.perm("losing").permanentId;
    const opposingWinnerId = s.perm("winner").permanentId;
    expect(observe(s.engine).hasPierce(s.perm("losing"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("losing").permanentId,
        target: { kind: "permanent", permanentId: s.perm("winner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === losingId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT25-050", "BT25-046"]),
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opposingWinnerId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
  });

  it("returns all misses to the bottom in reveal order and does not double-count one overlapping card", async () => {
    const misses = setupEngine({
      0: { hand: [{ card: "BT25-046", as: "gekkomon" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    await misses.ready();
    expect(misses.engine.applyIntent(0, { type: "playCard", instanceId: misses.inst("gekkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        misses.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT25-046") &&
        misses.state.players[0]!.deck.length === 3,
    );
    expect(misses.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);

    const overlap = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-046", as: "gekkomon" }],
          deck: [
            { card: "BT25-049", as: "overlap" },
            { card: "BT1-009", as: "missOne" },
            { card: "BT1-010", as: "missTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await overlap.ready();
    expect(
      overlap.engine.applyIntent(0, { type: "playCard", instanceId: overlap.inst("gekkomon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() =>
      overlap.state.players[0]!.hand.some((card) => card.instanceId === overlap.inst("overlap").instanceId),
    );
    expect(overlap.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([overlap.inst("overlap").instanceId]);
    expect(overlap.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      overlap.inst("missOne").instanceId,
      overlap.inst("missTwo").instanceId,
    ]);
  });
});
