import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-021.js";

describe("BT15-021", () => {
  it("reveals three to add one Sea Beast/Plesiosaur/Beastkin/X Antibody card", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3 });
  });
  it("restricts one opposing Digimon with no more digivolution cards from attacking", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd" }],
    }));

  it("on play adds one matching trait card and bottoms both misses", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-021", as: "gomamon" }],
          deck: [
            { card: "BT1-030", as: "seaBeast" },
            { card: "BT1-009", as: "nameMiss" },
            { card: "BT1-097", as: "optionMiss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gomamon"));
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("seaBeast").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("nameMiss").instanceId, s.inst("optionMiss").instanceId]),
    );
  });

  it("when digivolving independently resolves the same reveal with a Plesiosaur hit", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-021", as: "gomamon" }],
          deck: [
            { card: "BT10-022", as: "plesiosaur" },
            { card: "BT1-009", as: "missOne" },
            { card: "BT1-097", as: "missTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gomamon"));
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("plesiosaur").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("snapshots source-count eligibility, remains locked after sources increase, and triggers once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["BT15-001", "BT15-021"] },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "equal", under: ["BT15-001", "BT15-002"] },
            { card: "BT1-009", as: "fewer", under: ["BT15-001"] },
            { card: "BT1-009", as: "more", under: ["BT15-001", "BT15-002", "BT15-003"] },
          ],
          hand: [{ card: "BT1-009", as: "addedSource" }],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("equal"), "attack"));
    await advance(s.engine).verb.placeUnder(s.perm("equal").permanentId, [s.inst("addedSource").instanceId]);

    expect(s.perm("equal").stack).toHaveLength(3);
    expect(observe(s.engine).isRestricted(s.perm("equal"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("more"), "attack")).toBe(false);
    await settle(() => s.state.players[1]!.security.length === 1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(observe(s.engine).isRestricted(s.perm("fewer"), "attack")).toBe(false);
  });
});
