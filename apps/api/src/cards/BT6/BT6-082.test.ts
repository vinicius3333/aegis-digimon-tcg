import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT10/BT10-016.js";
import "../BT10/BT10-112.js";
import "../BT8/BT8-015.js";
import "../EX5/EX5-010.js";
import "./BT6-082.js";
import "./BT6-111.js";

describe("BT6-082 Sistermon Blanc", () => {
  it("grants Blocker to Sistermon while Huckmon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-082", as: "blanc" },
          { card: "BT6-009", as: "huckmon" },
          { card: "BT6-084", as: "sistermon" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("sistermon"), "Blocker")).toBe(true);
  });

  it("does not offer itself as a blocker without Huckmon or a Royal Knight", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "attacker" }],
      },
      1: {
        battleArea: [{ card: "BT6-082", as: "blanc" }],
        security: ["BT1-011"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("blanc"), "Blocker")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.events.filter((event) => event.kind === "blockWindowOpened")).toEqual([]);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("waits for a real block response while its Huckmon aura is active", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "attacker" }],
      },
      1: {
        battleArea: [
          { card: "BT6-082", as: "blanc" },
          { card: "BT6-009", as: "huckmon" },
        ],
        security: ["BT1-011"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    const opened = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(opened).toMatchObject({ eligibleBlockerIds: [s.perm("blanc").permanentId] });
    expect(observe(s.engine).isAttacking()).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);

    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("removes Blocker as soon as the last enabling Digimon leaves play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-082", as: "blanc" },
          { card: "BT6-009", as: "huckmon" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("blanc"), "Blocker")).toBe(true);

    const huckmonId = s.perm("huckmon").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([huckmonId])).toBe(1);

    expect(observe(s.engine).hasKeyword(s.perm("blanc"), "Blocker")).toBe(false);
  });

  it("draws one card on play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT6-082", as: "source" }], deck: [{ card: "BT6-083", as: "drawn" }] },
    });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(player.deck).toHaveLength(0);
  });
});

/**
 * Jesmon GX digivolves onto an Alphamon whose stack holds Silphymon (inherited [When Attacking]
 * delete 5000 DP or less). Its [When Digivolving] places Jesmon (X Antibody) under it, borrows that
 * card's [When Digivolving] to play this Sistermon Blanc, then ＜Blitz＞ attacks. The opponent's
 * 5000 DP Sandiramon has [On Deletion] delete 1 of your Digimon with 5000 DP or less, which only
 * this Sistermon Blanc (3000 + 2000 from Jesmon X) satisfies.
 */
async function jesmonGxBlitzAfterPlayingBlanc(preferTriggerKeys: string[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT6-111", as: "host", under: [{ card: "BT8-015", as: "silphymon" }] }],
        hand: [
          { card: "BT10-112", as: "jesmonGx" },
          { card: "BT10-016", as: "jesmonX" },
          { card: "BT6-082", as: "blanc" },
        ],
        deck: ["BT1-001", "BT1-002", "BT1-003"],
      },
      1: {
        battleArea: [{ card: "EX5-010", as: "sandiramon", dp: 5000 }],
        security: ["BT1-004", "BT1-005"],
        deck: ["BT1-007"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, preferTriggerKeys },
  );
  s.state.memory = 4;
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  const deckAtMain = s.state.players[0]!.deck.length;

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("jesmonGx").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.engine.hasAcceptedBlitzAttack(s.perm("host").permanentId) && s.state.pendingDecision === undefined,
  );
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  await turn;

  const blancOnPlayResolved = s.events.some(
    (event) => event.kind === "effectResolved" && event.sourceInstanceId === s.inst("blanc").instanceId,
  );
  const orderPrompts = s.decisions.filter(({ req }) => req.kind === "orderTriggers");
  return { s, deckAtMain, blancOnPlayResolved, orderPrompts };
}

describe("BT6-082 Sistermon Blanc — KB Q&A rulings", () => {
  it("lets the turn player order its [On Play] against [When Attacking] effects of a Blitz attack from the same effect (Q2044)", async () => {
    const { s, orderPrompts } = await jesmonGxBlitzAfterPlayingBlanc(["BT8-015"]);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("sandiramon").instanceId);
    expect(
      orderPrompts.some(({ req }) =>
        ["BT6-082", "BT8-015"].every((cardId) => req.options?.triggerCardIds?.includes(cardId)),
      ),
    ).toBe(true);
  });

  it("does not activate its pending [On Play] once an [On Deletion] triggered by the Blitz attack deletes it (Q2045)", async () => {
    const { s, deckAtMain, blancOnPlayResolved } = await jesmonGxBlitzAfterPlayingBlanc(["BT8-015"]);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("sandiramon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("blanc").instanceId);
    expect(blancOnPlayResolved).toBe(false);
    const digivolutionDraw = 1;
    expect(s.state.players[0]!.deck).toHaveLength(deckAtMain - digivolutionDraw);
  });
});
