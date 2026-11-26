import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "BD02-09";
const vanillaGreenLevel3 = "BT1-065";
const darkTyrannomon = "BT1-019";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel4 = "BT1-014";

function buildDeck() {
  return Array.from({ length: 6 }, () => vanillaRedLevel3);
}

type UseParams = { ownSecond: string };

async function useInOwnTurn({ ownSecond }: UseParams) {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: vanillaGreenLevel3, as: "green" },
          { card: ownSecond, as: "second" },
        ],
        hand: [{ card: cardId, as: "option" }],
        deck: buildDeck(),
      },
      1: {
        battleArea: [
          { card: vanillaRedLevel3, as: "locked", suspended: true },
          { card: vanillaRedLevel3, as: "free", suspended: true },
        ],
        deck: buildDeck(),
      },
    },
    { autoSelectCards: true, preferInstanceIds },
  );
  preferInstanceIds.push(s.perm("second").topCard!.instanceId, s.perm("locked").topCard!.instanceId);
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  await drainMicrotasks(20);
  s.state.memory = 2;
  const secondPrintedDP = s.perm("second").currentDP;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("second").currentDP === secondPrintedDP + 3000 && s.state.pendingDecision === undefined);
  await drainMicrotasks(40);
  return { s, turn, secondPrintedDP };
}

describe("BD02-09 Giant Shadow of Rust", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD02",
      nameEn: "Giant Shadow of Rust",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 2,
      rarity: "C",
      effectText:
        "[Main] 1 of your Digimon gets +3000 DP for the turn. Then, if you have a Digimon with [Tyrannomon] in its name, 1 of your opponent's Digimon can't unsuspend until their turn ends.",
      securityEffectText: "[Security] Suspend 1 of your opponent's Digimon. Then, add this card to the hand.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gives 1 of your Digimon +3000 DP for the turn without locking anything when you have no Tyrannomon", async () => {
    const { s, turn, secondPrintedDP } = await useInOwnTurn({ ownSecond: vanillaRedLevel4 });

    expect(s.state.memory).toBe(0);
    expect(s.perm("green").currentDP).toBe(4000);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("free"), "unsuspend")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("second").currentDP).toBe(secondPrintedDP);
    assertNoLoudGap(s);
  });

  it("then keeps 1 opposing Digimon suspended through their turn while you have a Digimon with Tyrannomon in its name", async () => {
    const { s, turn } = await useInOwnTurn({ ownSecond: darkTyrannomon });

    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("free"), "unsuspend")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);

    expect(s.perm("locked").isSuspended).toBe(true);
    expect(s.perm("free").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(false);
    assertNoLoudGap(s);
  });

  it("cannot be used without a green Digimon or Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: darkTyrannomon, as: "red" }], hand: [{ card: cardId, as: "option" }] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("suspends 1 opposing Digimon from security and then adds itself to the hand", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { security: [{ card: cardId, as: "option" }] },
        1: {
          battleArea: [
            { card: vanillaRedLevel3, as: "attacker" },
            { card: vanillaRedLevel3, as: "bystander" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("bystander").topCard!.instanceId);
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === cardId), 5000);

    expect(s.perm("bystander").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === cardId)).toBe(false);
  });
});
