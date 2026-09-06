import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_046 } from "./BT25-046.js";
import "../index.js";

describe("BT25-046 Gekkomon", () => {
  it("reveals three and adds Glowing Dawn plus green BEATBREAK", () => {
    const effect = BT25_046.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect((effect?.actions?.[0] as { add?: unknown }).add).toEqual([
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

  it("executes inherited Piercing after a public battle win", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-050", as: "winner", under: ["BT25-046"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "loser", suspended: true }], security: ["BT1-010"] },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("winner"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: s.perm("loser").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("returns all misses to the bottom in reveal order and does not double-count one overlapping card", async () => {
    const misses = setupEngine({
      0: { hand: [{ card: "BT25-046", as: "gekkomon" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    await misses.ready();
    expect(misses.engine.applyIntent(0, { type: "playCard", instanceId: misses.inst("gekkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => misses.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-046"));
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
