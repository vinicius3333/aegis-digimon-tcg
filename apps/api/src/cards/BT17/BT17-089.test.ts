import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT14/BT14-043.js";
import { compiled } from "./BT17-089.js";
import "./index.js";

type BoardExtra = { card: string; as: string };

/**
 * Board where seat 0's KoDokugumon (BT14-043) [On Play] effect-suspends Terriermon as its
 * cost, which is the only suspension Rhythm's first [Your Turn] watcher may react to.
 * `extras` add the witnesses the ＜Draw 1＞ condition inspects.
 */
async function effectSuspendOwnDigimon(extras: BoardExtra[]) {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT17-043", as: "suspendedByCost" }, { card: "BT17-089", as: "rhythm" }, ...extras],
        hand: [{ card: "BT14-043", as: "suspender" }],
        deck: [{ card: "BT1-011", as: "topOfDeck" }],
      },
      1: { battleArea: [{ card: "BT17-044", as: "opponentTarget" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
  );
  preferInstanceIds.push(s.perm("suspendedByCost").permanentId);
  s.state.memory = 10;

  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.perm("rhythm").isSuspended);
  await drainMicrotasks();
  return s;
}

describe("BT17-089 Rhythm", () => {
  it("matches the immutable catalog identity and preserves full IR coverage", () => {
    expect(getCardDefinition("BT17-089")).toMatchObject({
      nameEn: "Rhythm",
      colors: ["Green", "Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      effectText: expect.stringContaining("When an effect suspends"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("provides both suspension-triggered Your Turn effects", () => {
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            { kind: "Suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
          ],
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn" });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
    });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      actions: [
        { kind: "GainMemory", amount: 1 },
        {
          kind: "Draw",
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "youHave",
                filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Argomon"], match: "nameExact" }] },
              },
              {
                kind: "youHave",
                filter: {
                  kind: ["Digimon"],
                  colors: ["Yellow"],
                  nameOrTrait: [{ tokens: ["Agumon", "Greymon"], match: "nameExact" }],
                },
              },
            ],
          },
        },
      ],
    });
  });

  it("provides the Security play effect", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost" }],
    });
  });

  it("suspends after an effect suspends a Digimon, then gains memory and draws", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-043", as: "suspendedByCost" },
            { card: "BT17-089", as: "rhythm" },
            { card: "BT17-045", as: "argomon" },
          ],
          hand: [{ card: "BT14-043", as: "suspender" }],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT17-044", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("suspendedByCost").permanentId);
    s.state.memory = 10;
    const drawnId = s.inst("drawn").instanceId;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.perm("suspendedByCost").isSuspended).toBe(true);
    expect(s.perm("rhythm").isSuspended).toBe(true);
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);
  });

  it("gains memory but does not draw when neither Argomon nor a yellow Agumon/Greymon is present", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-043", as: "suspendedByCost" },
            { card: "BT17-089", as: "rhythm" },
          ],
          hand: [{ card: "BT14-043", as: "suspender" }],
          deck: [{ card: "BT1-011", as: "notDrawn" }],
        },
        1: { battleArea: [{ card: "BT17-044", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("suspendedByCost").permanentId);
    s.state.memory = 10;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rhythm").isSuspended);

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
  });

  it("naturally plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-086", as: "attacker" }] },
        1: { security: [{ card: "BT17-089", as: "securityRhythm" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const instanceId = s.inst("securityRhythm").instanceId;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
  });
  it("draws for an exact yellow [Agumon] witness", async () => {
    const s = await effectSuspendOwnDigimon([{ card: "BT2-033", as: "yellowAgumon" }]);

    expect(s.perm("rhythm").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("topOfDeck").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("does not draw for a yellow ClearAgumon — [Agumon] is an exact name, not a substring", async () => {
    const s = await effectSuspendOwnDigimon([{ card: "BT11-035", as: "clearAgumon" }]);

    expect(s.perm("rhythm").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("topOfDeck").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("does not draw for a red [Agumon] — the second branch is colour-gated to yellow", async () => {
    const s = await effectSuspendOwnDigimon([{ card: "BT3-007", as: "redAgumon" }]);

    expect(s.perm("rhythm").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("does not draw for a Gargomon — [Argomon] is an exact name, not a substring", async () => {
    const s = await effectSuspendOwnDigimon([{ card: "BT22-046", as: "gargomon" }]);

    expect(s.perm("rhythm").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("Q2872: an attack declaration is a rules suspension, so Rhythm stays unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 20_000 },
            { card: "BT17-089", as: "rhythm" },
            { card: "BT17-045", as: "argomon" },
          ],
          hand: [{ card: "BT1-011", as: "spare" }],
          deck: [{ card: "BT1-012", as: "topOfDeck" }],
        },
        1: { battleArea: [{ card: "BT17-044", as: "defender", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    await drainMicrotasks();

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("rhythm").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("[Your Turn] stays silent when the opponent's effect suspends one of your Digimon on their turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-089", as: "rhythm" },
            { card: "BT17-045", as: "argomon" },
            { card: "BT17-044", as: "victim" },
          ],
          deck: [{ card: "BT1-011", as: "topOfDeck" }],
        },
        1: {
          battleArea: [{ card: "BT17-043", as: "opponentCost" }],
          hand: [{ card: "BT14-043", as: "suspender" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("opponentCost").permanentId, s.perm("victim").permanentId);
    s.state.turnSeat = 1;
    s.state.memory = 10;

    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim").isSuspended);
    await drainMicrotasks();

    expect(s.perm("victim").isSuspended).toBe(true);
    expect(s.perm("rhythm").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
