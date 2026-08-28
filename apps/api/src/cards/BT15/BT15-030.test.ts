import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-030.js";

describe("BT15-030", () => {
  it("matches the immutable catalog identity and blue level-5 evolution route", () => {
    expect(getCardDefinition("BT15-030")).toMatchObject({
      nameEn: "Pukumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 10,
      dp: 10000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 3 }],
      types: ["Mutant"],
    });
  });

  it("retains Blocker", () =>
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] }));
  it("trashes up to two cards from every opposing stack and returns a stackless Digimon to deck bottom", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "TrashDigivolution", amount: 2, fromTop: true, target: { count: "all" } },
        { kind: "Return", to: "deckBottom", target: { filter: { digivolutionCards: "none" } } },
      ],
    });
  });
  it("repeats the same removal on deletion", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        { kind: "TrashDigivolution", amount: 2 },
        { kind: "Return", to: "deckBottom" },
      ],
    }));

  it("On Play trashes the top two sources from every opposing stack, then bottoms one newly stackless Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-030", as: "pukumon" }] },
        1: {
          battleArea: [
            {
              card: "BT15-029",
              as: "returned",
              under: [
                { card: "BT15-002", as: "returnedBottom" },
                { card: "BT15-023", as: "returnedTop" },
              ],
            },
            {
              card: "BT15-029",
              as: "survivor",
              under: [
                { card: "BT15-002", as: "survivingBottom" },
                { card: "BT15-019", as: "trashedMiddle" },
                { card: "BT15-023", as: "trashedTop" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pukumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some(({ instanceId }) => instanceId === s.inst("returned").instanceId));

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("returnedBottom").instanceId,
        s.inst("returnedTop").instanceId,
        s.inst("trashedMiddle").instanceId,
        s.inst("trashedTop").instanceId,
      ]),
    );
    expect(s.perm("survivor").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("survivingBottom").instanceId,
    ]);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(s.inst("returned").instanceId);
  });

  it("On Deletion resolves from its leaving snapshot and returns a stackless opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-030", as: "pukumon" }] },
      1: {
        battleArea: [
          {
            card: "BT15-029",
            as: "target",
            under: [
              { card: "BT15-002", as: "bottom" },
              { card: "BT15-023", as: "top" },
            ],
          },
          { card: "BT15-031", as: "attacker" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("pukumon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some(({ instanceId }) => instanceId === s.inst("target").instanceId));

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT15-030");
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("bottom").instanceId, s.inst("top").instanceId]),
    );
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(s.inst("target").instanceId);
  });

  it("suspends at blocker timing to redirect an opposing player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-030", as: "pukumon" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT15-025", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("pukumon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pukumon").isSuspended);

    expect(s.perm("pukumon").isSuspended).toBe(true);
  });
});
