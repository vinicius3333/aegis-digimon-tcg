import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-011.js";

describe("BT15-011", () => {
  it("has the printed Blocker keyword", () =>
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] }));
  it("reveals four to add a SoC Digimon and a Tamer, then trashes one card if cards were added", () => {
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 4,
      rest: "deckBottom",
      add: [{ count: 1 }, { count: 1 }],
    });
    expect(compiled.effects?.[1]?.actions[1]).toMatchObject({
      kind: "Trash",
      target: { count: 1, filter: { zone: "hand" } },
      condition: { kind: "ifThisEffectActed" },
    });
  });

  it("adds both a SoC Digimon and SoC Tamer when available, bottoms misses, then trashes one added card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-011", as: "tyrannomon" }],
          deck: [
            { card: "BT14-071", as: "socDigimon" },
            { card: "BT14-087", as: "socTamer" },
            { card: "BT12-092", as: "nonSocTamer" },
            { card: "BT1-097", as: "optionMiss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const hits = [s.inst("socDigimon").instanceId, s.inst("socTamer").instanceId];

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tyrannomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect([
      ...s.state.players[0]!.hand.map((card) => card.instanceId),
      ...s.state.players[0]!.trash.map((card) => card.instanceId),
    ]).toEqual(expect.arrayContaining(hits));
    expect(s.state.players[0]!.hand.filter((card) => hits.includes(card.instanceId))).toHaveLength(1);
    expect(s.state.players[0]!.trash.filter((card) => hits.includes(card.instanceId))).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("nonSocTamer").instanceId, s.inst("optionMiss").instanceId]),
    );
  });

  it("does not trash from hand when the reveal contains no qualifying SoC Digimon or Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT15-011", as: "tyrannomon" },
            { card: "BT1-009", as: "kept" },
          ],
          deck: ["BT1-009", "BT12-092", "BT1-097", "BT1-001"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tyrannomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 4);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("reaches Tyrannomon through its legal red level-3 evolution route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [{ card: "BT15-011", as: "tyrannomon" }],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT15-011");

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack).toHaveLength(2);
  });

  it("can suspend to block an opposing player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 5000 }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT15-011", as: "tyrannomon", dp: 4000 }], security: ["BT1-001"] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const blockerId = s.perm("tyrannomon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === blockerId));

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
